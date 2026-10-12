
"""
NearSpot - Database-backed OpenStreetMap place discovery.

Features:
- Reuse previously discovered geographic areas
- Store normalized OSM places in PostgreSQL
- Refresh expired discovery data
- Serve stale data when Overpass is unavailable
- Prevent duplicate places in responses
- Limit concurrent Overpass requests
- Apply a shared cooldown after failures

This service does not register ExternalPlace records.
Saving and reviewing places remain separate operations.
"""

import logging
import uuid
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from spots.models import OSMDiscoveryArea
from spots.services.osm import (
    fetch_external_places,
    validate_bbox,
    OSMServiceError,
)

logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

DISCOVERY_CACHE_HOURS = 24
STALE_CACHE_DAYS = 7

MAX_DISCOVERY_RESULTS = 150

OVERPASS_LOCK_KEY = "nearspot:overpass:discovery:lock"

# Must exceed the combined duration of the primary
# and fallback Overpass requests in osm.py.
DISCOVERY_LOCK_TIMEOUT = 120

OVERPASS_COOLDOWN_KEY = "nearspot:overpass:cooldown"

# Match the frontend's minimum 60-second cooldown.
OVERPASS_FAILURE_COOLDOWN = 60

COORDINATE_PRECISION = 4


# ============================================================
# GEOGRAPHIC HELPERS
# ============================================================

def normalize_bounds(south, west, north, east):
    """Validate requested geographic boundaries."""
    return validate_bbox(south, west, north, east)


def round_bounds(south, west, north, east):
    """Round coordinates for consistent comparisons."""
    return (
        round(south, COORDINATE_PRECISION),
        round(west, COORDINATE_PRECISION),
        round(north, COORDINATE_PRECISION),
        round(east, COORDINATE_PRECISION),
    )


def bounds_contain(area, south, west, north, east):
    """Check whether a cached area covers the viewport."""
    return (
        area.south <= south
        and area.west <= west
        and area.north >= north
        and area.east >= east
    )


def place_inside_bounds(place, south, west, north, east):
    """Check whether a place belongs to the viewport."""
    try:
        latitude = float(place["latitude"])
        longitude = float(place["longitude"])
    except (KeyError, TypeError, ValueError, OverflowError):
        return False

    return (
        south <= latitude <= north
        and west <= longitude <= east
    )


# ============================================================
# FILTER AND DEDUPLICATE
# ============================================================

def filter_places(places, south, west, north, east):
    """Filter places to the viewport and remove duplicates."""
    if not isinstance(places, list):
        return []

    results = []
    seen = set()

    for place in places:
        if not isinstance(place, dict):
            continue

        if not place_inside_bounds(
            place, south, west, north, east
        ):
            continue

        osm_type = place.get("osm_type")
        osm_id = place.get("osm_id")

        if (
            osm_type not in ("node", "way", "relation")
            or not isinstance(osm_id, int)
            or isinstance(osm_id, bool)
            or osm_id <= 0
        ):
            continue

        identifier = (osm_type, osm_id)

        if identifier in seen:
            continue

        seen.add(identifier)
        results.append(place)

        if len(results) >= MAX_DISCOVERY_RESULTS:
            break

    return results


# ============================================================
# DATABASE CACHE
# ============================================================

def find_cached_area(south, west, north, east):
    """
    Find a stored area completely covering the viewport.

    Prefer the most recently fetched area.
    """
    return (
        OSMDiscoveryArea.objects.filter(
            south__lte=south,
            west__lte=west,
            north__gte=north,
            east__gte=east,
        )
        .order_by("-fetched_at")
        .first()
    )


def is_fresh(area):
    """Check whether the cached data is under 24 hours old."""
    if area is None:
        return False

    fresh_after = timezone.now() - timedelta(
        hours=DISCOVERY_CACHE_HOURS
    )

    return area.fetched_at >= fresh_after


def is_usable_stale(area):
    """Allow stale data for up to seven days."""
    if area is None:
        return False

    stale_after = timezone.now() - timedelta(
        days=STALE_CACHE_DAYS
    )

    return area.fetched_at >= stale_after


def cached_places(area, south, west, north, east):
    """Return cached places filtered to the viewport."""
    return filter_places(
        area.places,
        south,
        west,
        north,
        east,
    )


# ============================================================
# SAVE DISCOVERED AREA
# ============================================================

def save_discovered_area(
    south, west, north, east, places
):
    """
    Store successful discovery results.

    Refresh an existing area with exactly matching bounds.
    """
    with transaction.atomic():
        area = (
            OSMDiscoveryArea.objects.select_for_update()
            .filter(
                south=south,
                west=west,
                north=north,
                east=east,
            )
            .order_by("-fetched_at")
            .first()
        )

        if area is None:
            area = OSMDiscoveryArea.objects.create(
                south=south,
                west=west,
                north=north,
                east=east,
                places=places,
            )
        else:
            area.places = places
            area.fetched_at = timezone.now()

            area.save(
                update_fields=[
                    "places",
                    "fetched_at",
                ]
            )

    return area


# ============================================================
# DISCOVERY LOCK
# ============================================================

def acquire_discovery_lock():
    """
    Allow only one discovery operation per shared cache.

    cache.add() is atomic on suitable shared backends.
    """
    token = uuid.uuid4().hex

    acquired = cache.add(
        OVERPASS_LOCK_KEY,
        token,
        timeout=DISCOVERY_LOCK_TIMEOUT,
    )

    return token if acquired else None


def release_discovery_lock(token):
    """
    Release the lock if this request still owns it.

    This comparison and deletion are not atomic.
    A production Redis deployment should use an
    atomic token-checked lock release.
    """
    if not token:
        return

    if cache.get(OVERPASS_LOCK_KEY) == token:
        cache.delete(OVERPASS_LOCK_KEY)


# ============================================================
# MAIN DISCOVERY SERVICE
# ============================================================

def discover_places(south, west, north, east):
    """
    Discover nearby OpenStreetMap places.

    Workflow:
    1. Validate bounds.
    2. Return fresh database cache.
    3. Respect temporary Overpass cooldown.
    4. Acquire discovery lock.
    5. Fetch places from Overpass.
    6. Save results in PostgreSQL.
    7. Return stale data on temporary failures.
    """

    south, west, north, east = normalize_bounds(
        south, west, north, east
    )

    # --------------------------------------------------------
    # STEP 1: CHECK DATABASE CACHE
    # --------------------------------------------------------

    cached_area = find_cached_area(
        south, west, north, east
    )

    if is_fresh(cached_area):
        logger.debug(
            "NearSpot discovery: fresh database cache hit."
        )

        return cached_places(
            cached_area,
            south, west, north, east
        )

    # --------------------------------------------------------
    # STEP 2: CHECK GLOBAL COOLDOWN
    # --------------------------------------------------------

    if cache.get(OVERPASS_COOLDOWN_KEY):
        if is_usable_stale(cached_area):
            logger.info(
                "Overpass cooldown active. Serving stale data."
            )

            return cached_places(
                cached_area,
                south, west, north, east
            )

        raise OSMServiceError(
            "Place discovery is temporarily unavailable. "
            "Please try again shortly."
        )

    # --------------------------------------------------------
    # STEP 3: ACQUIRE LOCK
    # --------------------------------------------------------

    lock_token = acquire_discovery_lock()

    if lock_token is None:
        # Another request is already using Overpass.
        # Avoid holding a Django worker while waiting.

        if is_usable_stale(cached_area):
            return cached_places(
                cached_area,
                south, west, north, east
            )

        # The other request may have just finished.
        refreshed_area = find_cached_area(
            south, west, north, east
        )

        if is_fresh(refreshed_area):
            return cached_places(
                refreshed_area,
                south, west, north, east
            )

        raise OSMServiceError(
            "Place discovery is already in progress. "
            "Please try again shortly."
        )

    try:
        # ----------------------------------------------------
        # STEP 4: RECHECK CACHE AFTER LOCK
        # ----------------------------------------------------

        cached_area = find_cached_area(
            south, west, north, east
        )

        if is_fresh(cached_area):
            return cached_places(
                cached_area,
                south, west, north, east
            )

        # Another request could have set cooldown
        # immediately before this lock was acquired.
        if cache.get(OVERPASS_COOLDOWN_KEY):
            if is_usable_stale(cached_area):
                return cached_places(
                    cached_area,
                    south, west, north, east
                )

            raise OSMServiceError(
                "Place discovery is temporarily unavailable. "
                "Please try again shortly."
            )

        # ----------------------------------------------------
        # STEP 5: FETCH FROM OVERPASS
        # ----------------------------------------------------

        logger.info(
            "Starting Overpass discovery for bounds: "
            "%s, %s, %s, %s",
            south, west, north, east
        )

        try:
            places = fetch_external_places(
                south=south,
                west=west,
                north=north,
                east=east,
            )

        except OSMServiceError as error:
            logger.warning(
                "Overpass discovery failed: %s",
                error
            )

            # Prevent immediate repeated external calls.
            cache.set(
                OVERPASS_COOLDOWN_KEY,
                True,
                timeout=OVERPASS_FAILURE_COOLDOWN,
            )

            if is_usable_stale(cached_area):
                logger.info(
                    "Serving stale database-cached places."
                )

                return cached_places(
                    cached_area,
                    south, west, north, east
                )

            raise

        # ----------------------------------------------------
        # STEP 6: NORMALIZE RESPONSE
        # ----------------------------------------------------

        places = filter_places(
            places,
            south, west, north, east
        )

        # ----------------------------------------------------
        # STEP 7: SAVE TO POSTGRESQL
        # ----------------------------------------------------

        save_discovered_area(
            south,
            west,
            north,
            east,
            places,
        )

        logger.info(
            "Stored %s discovered OSM places.",
            len(places)
        )

        cache.delete(OVERPASS_COOLDOWN_KEY)

        return places

    finally:
        release_discovery_lock(lock_token)
