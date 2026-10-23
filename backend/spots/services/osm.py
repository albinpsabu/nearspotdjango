
"""
NearSpot — OpenStreetMap discovery and verification.

Responsibilities:
1. Discover named places using Overpass.
2. Cache geographic discovery results.
3. Fall back to other Overpass servers on failure.
4. Reuse stale data during temporary outages.
5. Verify individual places using the official OSM API.

This module does not write to the NearSpot database.
"""

import json
import logging
import math
import urllib.error
import urllib.parse
import urllib.request

from django.core.cache import cache

logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

OVERPASS_URLS = (
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
)

OSM_API_URL = "https://api.openstreetmap.org/api/0.6"

# Fresh discovery results: 24 hours.
CACHE_TIMEOUT = 24 * 60 * 60

# Stale discovery results: 7 days.
STALE_CACHE_TIMEOUT = 7 * 24 * 60 * 60

# Individual verified place caching.
EXTERNAL_PLACE_CACHE_TIMEOUT = 24 * 60 * 60
EXTERNAL_PLACE_NOT_FOUND_TIMEOUT = 5 * 60

REQUEST_TIMEOUT = 25
OVERPASS_REQUEST_TIMEOUT = 20

MAX_BBOX_AREA_KM2 = 16
MAX_RESULTS = 150
MAX_RESPONSE_BYTES = 5_000_000

# Geographic discovery cache configuration.
DISCOVERY_TILE_DEGREES = 0.01
DISCOVERY_CACHE_VERSION = "v6"
MAX_CACHED_BOUNDS_PER_TILE = 8
DISCOVERY_PADDING_RATIO = 0.20

# Failure recovery.
OVERPASS_ENDPOINT_COOLDOWN = 120
OVERPASS_ALL_FAILED_COOLDOWN = 45
DISCOVERY_LOCK_TIMEOUT = 35

VALID_OSM_TYPES = ("node", "way", "relation")
MAX_OSM_ID = 9223372036854775807

OSM_CATEGORIES = (
    "amenity",
    "shop",
    "healthcare",
    "tourism",
    "leisure",
    "historic",
    "office",
    "craft",
    "public_transport",
    "railway",
)

DISCOVERY_CATEGORIES = (
    "amenity",
    "shop",
    "healthcare",
    "tourism",
    "leisure",
    "historic",
    "office",
    "craft",
    "public_transport",
)

USER_AGENT = (
    "NearSpot/1.0 "
    "(OpenStreetMap place discovery and verification)"
)


# ============================================================
# CUSTOM EXCEPTIONS
# ============================================================

class OSMServiceError(Exception):
    """External OpenStreetMap service failed."""


class OSMValidationError(ValueError):
    """Invalid OpenStreetMap input."""


# ============================================================
# VALIDATE GEOGRAPHIC BOUNDING BOX
# ============================================================

def validate_bbox(south, west, north, east):
    """
    A bounding box defines the geographic rectangle
    visible on the map.

    Coordinate order:
    south, west, north, east.
    """

    try:
        south, west, north, east = map(
            float,
            (south, west, north, east),
        )
    except (TypeError, ValueError, OverflowError) as exc:
        raise OSMValidationError(
            "Bounding box coordinates must be valid numbers."
        ) from exc

    if not all(
        math.isfinite(value)
        for value in (south, west, north, east)
    ):
        raise OSMValidationError(
            "Bounding box coordinates must be finite numbers."
        )

    if not (-90 <= south <= 90 and -90 <= north <= 90):
        raise OSMValidationError(
            "Latitude must be between -90 and 90."
        )

    if not (-180 <= west <= 180 and -180 <= east <= 180):
        raise OSMValidationError(
            "Longitude must be between -180 and 180."
        )

    if south >= north or west >= east:
        raise OSMValidationError(
            "Invalid bounding box coordinate order."
        )

    # Approximate rectangle area in square kilometers.
    middle_latitude = (south + north) / 2
    height_km = (north - south) * 111.32

    width_km = (
        (east - west)
        * 111.32
        * math.cos(math.radians(middle_latitude))
    )

    if height_km * width_km > MAX_BBOX_AREA_KM2:
        raise OSMValidationError(
            "Search area is too large. "
            f"Maximum allowed area is {MAX_BBOX_AREA_KM2} km². "
            "Zoom in to discover places."
        )

    return south, west, north, east


# ============================================================
# VALIDATE OSM ELEMENT IDENTIFIER
# ============================================================

def validate_osm_identifier(osm_type, osm_id):
    """
    An OSM element is a node, way, or relation.

    Every element has a numeric identifier.
    """

    if osm_type not in VALID_OSM_TYPES:
        raise OSMValidationError(
            "Invalid OpenStreetMap element type."
        )

    if isinstance(osm_id, bool):
        raise OSMValidationError(
            "Invalid OpenStreetMap element ID."
        )

    if isinstance(osm_id, int):
        identifier = osm_id

    elif (
        isinstance(osm_id, str)
        and osm_id.isascii()
        and osm_id.isdecimal()
    ):
        try:
            identifier = int(osm_id)
        except ValueError as exc:
            raise OSMValidationError(
                "Invalid OpenStreetMap element ID."
            ) from exc

    else:
        raise OSMValidationError(
            "OpenStreetMap element ID must be an integer."
        )

    if identifier <= 0 or identifier > MAX_OSM_ID:
        raise OSMValidationError(
            "OpenStreetMap element ID is out of range."
        )

    return osm_type, identifier


# ============================================================
# BUILD OVERPASS DISCOVERY QUERY
# ============================================================

def build_overpass_query(south, west, north, east):
    """
    Generate an Overpass QL query.

    nwr = nodes + ways + relations.

    Only named places in selected categories are
    requested, avoiding generic roads and buildings.
    """

    bbox = f"{south},{west},{north},{east}"

    lines = [
        "[out:json][timeout:15];",
        "(",
    ]

    for category in DISCOVERY_CATEGORIES:
        lines.append(
            f'  nwr["{category}"]["name"]({bbox});'
        )

    lines.append(
        f'  nwr["railway"="station"]["name"]({bbox});'
    )

    lines.extend([
        ");",
        "out center;",
    ])

    return "\n".join(lines)


# ============================================================
# SINGLE PLACE OVERPASS QUERY
# ============================================================

def build_single_place_query(osm_type, osm_id):
    """
    Retained for compatibility with existing callers.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type,
        osm_id,
    )

    return (
        "[out:json][timeout:20];\n"
        f"{osm_type}({osm_id});\n"
        "out center;"
    )


# ============================================================
# EXTRACT PLACE CATEGORY
# ============================================================

def extract_category(tags):
    """
    Example:
    {"amenity": "hospital"} -> "amenity:hospital"
    """

    for key in OSM_CATEGORIES:
        value = tags.get(key)

        if isinstance(value, str) and value.strip():
            return f"{key}:{value.strip()}"

    return "other"


# ============================================================
# EXTRACT PLACE ADDRESS
# ============================================================

def extract_address(tags):
    """
    Construct a readable address from OSM address tags.
    """

    house_number = tags.get("addr:housenumber", "")
    street = tags.get("addr:street", "")

    locality = (
        tags.get("addr:suburb")
        or tags.get("addr:place")
        or ""
    )

    city = tags.get("addr:city", "")
    postcode = tags.get("addr:postcode", "")

    street_address = " ".join(
        part
        for part in (house_number, street)
        if isinstance(part, str) and part
    )

    return ", ".join(
        part
        for part in (
            street_address,
            locality,
            city,
            postcode,
        )
        if isinstance(part, str) and part
    )


# ============================================================
# NORMALIZE COORDINATES
# ============================================================

def normalize_coordinates(latitude, longitude):
    """
    Convert coordinates to valid finite floats.

    Invalid coordinates return None.
    """

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError, OverflowError):
        return None

    if not (
        math.isfinite(latitude)
        and math.isfinite(longitude)
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    ):
        return None

    return latitude, longitude


# ============================================================
# NORMALIZE OSM ELEMENT
# ============================================================

def normalize_osm_element(element):
    """
    Convert raw OSM data into NearSpot's standard
    external-place response structure.

    Nodes have direct coordinates.
    Ways and relations use their calculated center.
    """

    if not isinstance(element, dict):
        return None

    osm_type = element.get("type")
    osm_id = element.get("id")

    if osm_type not in VALID_OSM_TYPES:
        return None

    if (
        isinstance(osm_id, bool)
        or not isinstance(osm_id, int)
        or osm_id <= 0
        or osm_id > MAX_OSM_ID
    ):
        return None

    tags = element.get("tags") or {}

    if not isinstance(tags, dict):
        return None

    name = tags.get("name")

    if not isinstance(name, str) or not name.strip():
        return None

    if osm_type == "node":
        latitude = element.get("lat")
        longitude = element.get("lon")

    else:
        center = element.get("center") or {}

        if not isinstance(center, dict):
            return None

        latitude = center.get("lat")
        longitude = center.get("lon")

    coordinates = normalize_coordinates(
        latitude,
        longitude,
    )

    if coordinates is None:
        return None

    latitude, longitude = coordinates

    return {
        "osm_type": osm_type,
        "osm_id": osm_id,
        "name": name.strip()[:255],
        "category": extract_category(tags),
        "address": extract_address(tags),
        "latitude": latitude,
        "longitude": longitude,
    }


# ============================================================
# SAFE HTTP REQUEST
# ============================================================

def request_json(
    url,
    data=None,
    purpose="OSM request",
    timeout=None,
):
    """
    Make an HTTP request and decode JSON.

    Security and reliability:
    - User-Agent header
    - Request timeout
    - Maximum response size
    - Error handling
    """

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }

    if data is not None:
        headers["Content-Type"] = (
            "application/x-www-form-urlencoded"
        )

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST" if data is not None else "GET",
    )

    effective_timeout = (
        REQUEST_TIMEOUT if timeout is None else timeout
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=effective_timeout,
        ) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)

        if len(body) > MAX_RESPONSE_BYTES:
            raise OSMServiceError(
                "The OpenStreetMap response was too large."
            )

        return json.loads(body.decode("utf-8"))

    except urllib.error.HTTPError as exc:
        # Preserve 404 so the verification function
        # can distinguish a missing place from an outage.
        if exc.code == 404:
            raise

        logger.warning(
            "%s returned HTTP %s",
            purpose,
            exc.code,
        )

        raise OSMServiceError(
            "OpenStreetMap place data is temporarily unavailable."
        ) from exc

    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
    ) as exc:
        logger.warning(
            "%s connection failed: %s",
            purpose,
            exc,
        )

        raise OSMServiceError(
            "Could not connect to the OpenStreetMap service."
        ) from exc

    except (ValueError, UnicodeError) as exc:
        logger.warning(
            "Invalid JSON during %s: %s",
            purpose,
            exc,
        )

        raise OSMServiceError(
            "Received an invalid OpenStreetMap response."
        ) from exc


# ============================================================
# OVERPASS REQUEST WITH FALLBACK
# ============================================================

def request_overpass(query, purpose="discovery"):
    """
    Try Overpass endpoints in sequence.

    If a server fails, temporarily mark it unavailable
    so subsequent requests do not repeatedly hit it.
    """

    request_body = urllib.parse.urlencode(
        {"data": query}
    ).encode("utf-8")

    last_error = None

    # Remove duplicate URLs while preserving order.
    for endpoint in dict.fromkeys(OVERPASS_URLS):

        cooldown_key = (
            f"nearspot:overpass:down:{endpoint}"
        )

        # Skip servers that recently failed.
        if cache.get(cooldown_key):
            continue

        try:
            payload = request_json(
                endpoint,
                data=request_body,
                purpose=f"Overpass {purpose} ({endpoint})",
                timeout=OVERPASS_REQUEST_TIMEOUT,
            )

            if (
                not isinstance(payload, dict)
                or not isinstance(
                    payload.get("elements"), list
                )
            ):
                raise OSMServiceError(
                    "Unexpected Overpass response."
                )

            # A remark may indicate a timeout or
            # incomplete Overpass query execution.
            if payload.get("remark"):
                raise OSMServiceError(
                    "Overpass reported an incomplete response."
                )

            return payload["elements"]

        except (
            OSMServiceError,
            urllib.error.HTTPError,
        ) as exc:
            last_error = exc

            cache.set(
                cooldown_key,
                True,
                OVERPASS_ENDPOINT_COOLDOWN,
            )

            logger.warning(
                "Overpass endpoint unavailable: %s",
                endpoint,
            )

    raise OSMServiceError(
        "Place discovery is temporarily unavailable."
    ) from last_error


# ============================================================
# DISCOVERY CACHE HELPERS
# ============================================================

def _inside_bbox(place, south, west, north, east):
    """Check whether a place belongs to the viewport."""

    return (
        south <= place["latitude"] <= north
        and west <= place["longitude"] <= east
    )


def _discovery_key(south, west, north, east):
    """
    Group geographic locations into cache tiles.

    The key uses the viewport center rather than
    the exact viewport coordinates.
    """

    middle_latitude = (south + north) / 2
    middle_longitude = (west + east) / 2

    tile_latitude = math.floor(
        middle_latitude / DISCOVERY_TILE_DEGREES
    )

    tile_longitude = math.floor(
        middle_longitude / DISCOVERY_TILE_DEGREES
    )

    return (
        f"nearspot:osm:{DISCOVERY_CACHE_VERSION}:"
        f"{tile_latitude}:{tile_longitude}"
    )


def _nearby_cache_keys(south, west, north, east):
    """
    Search the current cache tile and its 8 neighbors.

    This allows cached results to be reused when
    panning crosses a nearby tile boundary.
    """

    mid_lat = (south + north) / 2
    mid_lon = (west + east) / 2

    lat_tile = math.floor(
        mid_lat / DISCOVERY_TILE_DEGREES
    )

    lon_tile = math.floor(
        mid_lon / DISCOVERY_TILE_DEGREES
    )

    return [
        (
            f"nearspot:osm:{DISCOVERY_CACHE_VERSION}:"
            f"{lat_tile + dy}:{lon_tile + dx}"
        )
        for dy in (-1, 0, 1)
        for dx in (-1, 0, 1)
    ]


def _covers(entry, bounds):
    """
    Only reuse a cache entry if its area fully
    covers the requested viewport.
    """

    if (
        not isinstance(entry, dict)
        or not isinstance(entry.get("places"), list)
    ):
        return False

    saved = entry.get("bounds")

    return (
        isinstance(saved, (tuple, list))
        and len(saved) == 4
        and saved[0] <= bounds[0]
        and saved[1] <= bounds[1]
        and saved[2] >= bounds[2]
        and saved[3] >= bounds[3]
    )


def _lookup_cached(keys, bounds, stale=False):
    """
    Look for a covering cached area.

    None means no cache was found.
    [] means the cached area contains no places.
    """

    suffix = ":stale" if stale else ""

    for key in keys:
        entries = cache.get(key + suffix, [])

        if not isinstance(entries, list):
            continue

        for entry in entries:
            if _covers(entry, bounds):
                return [
                    place
                    for place in entry["places"]
                    if _inside_bbox(place, *bounds)
                ][:MAX_RESULTS]

    return None


def _store_cached(key, bounds, places, stale=False):
    """
    Store several geographic areas per tile.

    This avoids replacing the previous cache entry
    every time the viewport changes.
    """

    suffix = ":stale" if stale else ""
    full_key = key + suffix

    entries = cache.get(full_key, [])

    if not isinstance(entries, list):
        entries = []

    entries = [
        entry
        for entry in entries
        if (
            isinstance(entry, dict)
            and entry.get("bounds") != bounds
        )
    ]

    entries.insert(
        0,
        {
            "bounds": bounds,
            "places": places,
        },
    )

    entries = entries[:MAX_CACHED_BOUNDS_PER_TILE]

    timeout = (
        STALE_CACHE_TIMEOUT
        if stale
        else CACHE_TIMEOUT
    )

    cache.set(full_key, entries, timeout)


def _expanded_bounds(bounds):
    """
    Expand the requested viewport by 20%.

    The extra surrounding area can be reused when
    the user pans slightly.

    If expansion exceeds 16 km², use the original
    viewport instead.
    """

    south, west, north, east = bounds

    lat_margin = (
        (north - south) * DISCOVERY_PADDING_RATIO
    )

    lon_margin = (
        (east - west) * DISCOVERY_PADDING_RATIO
    )

    expanded = (
        max(-90.0, south - lat_margin),
        max(-180.0, west - lon_margin),
        min(90.0, north + lat_margin),
        min(180.0, east + lon_margin),
    )

    try:
        validate_bbox(*expanded)
        return expanded

    except OSMValidationError:
        return bounds


# ============================================================
# FETCH NEARBY EXTERNAL PLACES
# ============================================================

def fetch_external_places(south, west, north, east):
    """
    Main external-place discovery function.

    Workflow:
    1. Validate viewport.
    2. Check fresh cache.
    3. Check service cooldown.
    4. Acquire a request lock.
    5. Fetch from Overpass.
    6. Normalize and deduplicate.
    7. Cache results.
    8. Return visible places.

    During an outage, try stale cached results.
    """

    # STEP 1: Validate coordinates.
    bounds = validate_bbox(
        south, west, north, east
    )

    # Check the current tile and neighboring tiles.
    keys = _nearby_cache_keys(*bounds)

    # STEP 2: Reuse fresh cache if available.
    fresh = _lookup_cached(keys, bounds)

    if fresh is not None:
        logger.debug("OSM discovery fresh cache hit")
        return fresh

    # STEP 3: Avoid retrying immediately after
    # all Overpass endpoints fail.
    cooldown_key = (
        "nearspot:osm:discovery:all-failed"
    )

    if cache.get(cooldown_key):
        stale = _lookup_cached(
            keys,
            bounds,
            stale=True,
        )

        if stale is not None:
            return stale

        raise OSMServiceError(
            "Place discovery is temporarily unavailable."
        )

    # STEP 4: Best-effort duplicate request prevention.
    primary_key = _discovery_key(*bounds)
    lock_key = primary_key + ":fetch-lock"

    if not cache.add(
        lock_key,
        True,
        DISCOVERY_LOCK_TIMEOUT,
    ):
        stale = _lookup_cached(
            keys,
            bounds,
            stale=True,
        )

        if stale is not None:
            return stale

        raise OSMServiceError(
            "Place discovery is already being refreshed."
        )

    try:
        # Check cache again after acquiring the lock.
        fresh = _lookup_cached(keys, bounds)

        if fresh is not None:
            return fresh

        # STEP 5: Expand viewport and build query.
        requested_bounds = _expanded_bounds(bounds)

        query = build_overpass_query(
            *requested_bounds
        )

        try:
            elements = request_overpass(
                query,
                purpose="discovery",
            )

        except OSMServiceError:
            # Temporarily pause new discovery attempts.
            cache.set(
                cooldown_key,
                True,
                OVERPASS_ALL_FAILED_COOLDOWN,
            )

            # Try older cached data.
            stale = _lookup_cached(
                keys,
                bounds,
                stale=True,
            )

            if stale is not None:
                logger.warning(
                    "Serving stale cached OSM discovery results"
                )
                return stale

            raise

        # STEP 6: Normalize and deduplicate results.
        places = []
        seen = set()

        for element in elements:
            place = normalize_osm_element(element)

            if place is None:
                continue

            identifier = (
                place["osm_type"],
                place["osm_id"],
            )

            if identifier in seen:
                continue

            seen.add(identifier)
            places.append(place)

        # STEP 7: Cache the complete fetched area.
        _store_cached(
            primary_key,
            requested_bounds,
            places,
        )

        # Save a second, longer-lived stale copy.
        _store_cached(
            primary_key,
            requested_bounds,
            places,
            stale=True,
        )

        # STEP 8: Return only currently visible places.
        return [
            place
            for place in places
            if _inside_bbox(place, *bounds)
        ][:MAX_RESULTS]

    finally:
        # Always release the request lock.
        cache.delete(lock_key)


# ============================================================
# BUILD OFFICIAL OSM API URL
# ============================================================

def build_osm_api_url(osm_type, osm_id, full=False):
    """
    Construct a JSON URL for official OSM verification.

    Example:
    /api/0.6/node/123.json

    Ways and relations can request /full geometry.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type,
        osm_id,
    )

    url = f"{OSM_API_URL}/{osm_type}/{osm_id}"

    if full and osm_type in ("way", "relation"):
        url += "/full"

    return url + ".json"


# ============================================================
# CALCULATE GEOMETRY CENTER
# ============================================================

def calculate_geometry_center(coordinates):
    """
    Calculate a representative center from coordinates.

    Use a circular mean for longitude so coordinates
    near the international date line are handled.
    """

    valid = []

    for coordinate in coordinates:
        if isinstance(coordinate, dict):
            latitude = coordinate.get("lat")
            longitude = coordinate.get("lon")

        elif (
            isinstance(coordinate, (tuple, list))
            and len(coordinate) >= 2
        ):
            latitude, longitude = coordinate[:2]

        else:
            continue

        point = normalize_coordinates(
            latitude,
            longitude,
        )

        if point is not None:
            valid.append(point)

    if not valid:
        return None

    latitude = (
        sum(point[0] for point in valid) / len(valid)
    )

    sin_sum = sum(
        math.sin(math.radians(point[1]))
        for point in valid
    )

    cos_sum = sum(
        math.cos(math.radians(point[1]))
        for point in valid
    )

    longitude = math.degrees(
        math.atan2(sin_sum, cos_sum)
    )

    return normalize_coordinates(
        latitude,
        longitude,
    )


# ============================================================
# EXTRACT GEOMETRY CENTER
# ============================================================

def extract_osm_geometry_center(
    elements,
    osm_type,
    osm_id,
):
    """
    Find the representative center of an OSM element.

    Node:
        Use direct coordinates.

    Way:
        Use referenced node coordinates.

    Relation:
        Use coordinates from member nodes and ways.
    """

    if not isinstance(elements, list):
        return None

    nodes = {}
    ways = {}
    target = None

    for element in elements:
        if not isinstance(element, dict):
            continue

        element_type = element.get("type")
        element_id = element.get("id")

        if element_type == "node":
            point = normalize_coordinates(
                element.get("lat"),
                element.get("lon"),
            )

            if point is not None:
                nodes[element_id] = point

        elif element_type == "way":
            ways[element_id] = element

        if (
            element_type == osm_type
            and element_id == osm_id
        ):
            target = element

    if target is None:
        return None

    if osm_type == "node":
        return nodes.get(osm_id)

    if osm_type == "way":
        coordinates = [
            nodes[node_id]
            for node_id in target.get("nodes", [])
            if node_id in nodes
        ]

        return calculate_geometry_center(coordinates)

    if osm_type == "relation":
        coordinates = []

        for member in target.get("members", []):
            member_type = member.get("type")
            member_id = member.get("ref")

            if member_type == "node":
                point = nodes.get(member_id)

                if point is not None:
                    coordinates.append(point)

            elif member_type == "way":
                way = ways.get(member_id)

                if way is None:
                    continue

                for node_id in way.get("nodes", []):
                    point = nodes.get(node_id)

                    if point is not None:
                        coordinates.append(point)

        return calculate_geometry_center(coordinates)

    return None


# ============================================================
# FETCH OFFICIAL OSM ELEMENT
# ============================================================

def fetch_official_osm_element(osm_type, osm_id):
    """
    Verify a place using the official OpenStreetMap API.

    Unlike Overpass discovery, this checks an individual
    OSM element by its type and ID.

    If a way/relation lacks a center, fetch full geometry
    and calculate a representative center.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type,
        osm_id,
    )

    url = build_osm_api_url(
        osm_type,
        osm_id,
    )

    try:
        payload = request_json(
            url,
            purpose="official OSM verification",
        )

    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise

    if not isinstance(payload, dict):
        raise OSMServiceError(
            "Unexpected official OSM API response."
        )

    elements = payload.get("elements")

    if not isinstance(elements, list):
        raise OSMServiceError(
            "Official OSM API returned invalid elements."
        )

    target = next(
        (
            element
            for element in elements
            if (
                isinstance(element, dict)
                and element.get("type") == osm_type
                and element.get("id") == osm_id
            )
        ),
        None,
    )

    if target is None:
        return None

    tags = target.get("tags") or {}

    if not isinstance(tags, dict):
        return None

    name = tags.get("name")

    if not isinstance(name, str) or not name.strip():
        return None

    if osm_type == "node":
        coordinates = normalize_coordinates(
            target.get("lat"),
            target.get("lon"),
        )

    else:
        center = target.get("center") or {}
        coordinates = None

        if isinstance(center, dict):
            coordinates = normalize_coordinates(
                center.get("lat"),
                center.get("lon"),
            )

        if coordinates is None:
            full_url = build_osm_api_url(
                osm_type,
                osm_id,
                full=True,
            )

            try:
                full_payload = request_json(
                    full_url,
                    purpose="official OSM geometry lookup",
                )

            except urllib.error.HTTPError as exc:
                if exc.code == 404:
                    return None
                raise

            if not isinstance(full_payload, dict):
                raise OSMServiceError(
                    "Invalid OSM geometry response."
                )

            coordinates = extract_osm_geometry_center(
                full_payload.get("elements", []),
                osm_type,
                osm_id,
            )

    if coordinates is None:
        return None

    latitude, longitude = coordinates

    return {
        "osm_type": osm_type,
        "osm_id": osm_id,
        "name": name.strip()[:255],
        "category": extract_category(tags),
        "address": extract_address(tags),
        "latitude": latitude,
        "longitude": longitude,
    }


# ============================================================
# FETCH AND VERIFY SINGLE EXTERNAL PLACE
# ============================================================

def fetch_external_place_by_id(osm_type, osm_id):
    """
    Verify a single OSM place and cache the result.

    Valid place:
        Cache for 24 hours.

    Missing place:
        Cache NOT_FOUND for 5 minutes.

    This reduces repeated official OSM API requests.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type,
        osm_id,
    )

    cache_key = (
        "nearspot:osm:verified:official:v2:"
        f"{osm_type}:{osm_id}"
    )

    cached_result = cache.get(cache_key)

    if cached_result is not None:
        if cached_result == "NOT_FOUND":
            return None

        return cached_result

    verified_place = fetch_official_osm_element(
        osm_type,
        osm_id,
    )

    if verified_place is None:
        cache.set(
            cache_key,
            "NOT_FOUND",
            EXTERNAL_PLACE_NOT_FOUND_TIMEOUT,
        )
        return None

    cache.set(
        cache_key,
        verified_place,
        EXTERNAL_PLACE_CACHE_TIMEOUT,
    )

    return verified_place
