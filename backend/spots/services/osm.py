
"""
OpenStreetMap discovery and verification service for NearSpot.

Features:
- Discover named places using Overpass API
- Primary and fallback Overpass servers
- 24-hour discovery cache
- 7-day stale-cache fallback
- Duplicate OSM element removal
- Official OSM API place verification
- Support for nodes, ways, and relations

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

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OVERPASS_FALLBACK_URL = (
    "https://overpass.kumi.systems/api/interpreter"
)

OSM_API_URL = "https://api.openstreetmap.org/api/0.6"

CACHE_TIMEOUT = 24 * 60 * 60
STALE_CACHE_TIMEOUT = 7 * 24 * 60 * 60

EXTERNAL_PLACE_CACHE_TIMEOUT = 24 * 60 * 60
EXTERNAL_PLACE_NOT_FOUND_TIMEOUT = 5 * 60

REQUEST_TIMEOUT = 25

# Allow Overpass enough time to execute the query.
OVERPASS_REQUEST_TIMEOUT = 20

MAX_BBOX_AREA_KM2 = 16
MAX_RESULTS = 150
MAX_RESPONSE_BYTES = 5_000_000

DISCOVERY_TILE_DEGREES = 0.01
DISCOVERY_CACHE_VERSION = "v5"

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
# EXCEPTIONS
# ============================================================

class OSMServiceError(Exception):
    """Raised when an external OSM service fails."""


class OSMValidationError(ValueError):
    """Raised when OSM input is invalid."""


# ============================================================
# VALIDATE BOUNDING BOX
# ============================================================

def validate_bbox(south, west, north, east):
    try:
        south, west, north, east = map(
            float, (south, west, north, east)
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
# VALIDATE OSM IDENTIFIER
# ============================================================

def validate_osm_identifier(osm_type, osm_id):
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
    Discover named places inside a geographic area.

    Avoid generic roads and buildings to reduce
    unnecessary markers.
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
# SINGLE PLACE OVERPASS QUERY (COMPATIBILITY)
# ============================================================

def build_single_place_query(osm_type, osm_id):
    osm_type, osm_id = validate_osm_identifier(
        osm_type, osm_id
    )

    return (
        "[out:json][timeout:20];\n"
        f"{osm_type}({osm_id});\n"
        "out center;"
    )


# ============================================================
# EXTRACT CATEGORY AND ADDRESS
# ============================================================

def extract_category(tags):
    for key in OSM_CATEGORIES:
        value = tags.get(key)

        if isinstance(value, str) and value.strip():
            return f"{key}:{value.strip()}"

    return "other"


def extract_address(tags):
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
        latitude, longitude
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
    request_body = urllib.parse.urlencode(
        {"data": query}
    ).encode("utf-8")

    endpoints = list(dict.fromkeys((
        OVERPASS_URL,
        OVERPASS_FALLBACK_URL,
    )))

    last_error = None

    for endpoint in endpoints:
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

            return payload["elements"]

        except (
            OSMServiceError,
            urllib.error.HTTPError,
        ) as exc:
            last_error = exc

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
    return (
        south <= place["latitude"] <= north
        and west <= place["longitude"] <= east
    )


def _discovery_key(south, west, north, east):
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


# ============================================================
# FETCH NEARBY EXTERNAL PLACES
# ============================================================

def fetch_external_places(south, west, north, east):
    """
    Discover named places inside the map viewport.

    Reuse cached results only when the stored bounds
    fully cover the requested viewport.
    """

    south, west, north, east = validate_bbox(
        south, west, north, east
    )

    cache_key = _discovery_key(
        south, west, north, east
    )

    stale_key = cache_key + ":stale"

    def covered(entry):
        if not isinstance(entry, dict):
            return False

        bounds = entry.get("bounds")

        return (
            isinstance(bounds, (tuple, list))
            and len(bounds) == 4
            and bounds[0] <= south
            and bounds[1] <= west
            and bounds[2] >= north
            and bounds[3] >= east
        )

    def filtered(entry):
        return [
            place
            for place in entry["places"]
            if _inside_bbox(
                place,
                south,
                west,
                north,
                east,
            )
        ][:MAX_RESULTS]

    # STEP 1: Check fresh cache.

    cached = cache.get(cache_key)

    if covered(cached):
        return filtered(cached)

    # STEP 2: Fetch from Overpass.

    query = build_overpass_query(
        south, west, north, east
    )

    try:
        elements = request_overpass(
            query,
            purpose="discovery",
        )
    except OSMServiceError:
        stale = cache.get(stale_key)

        if covered(stale):
            logger.warning(
                "Serving stale cached OSM discovery results"
            )
            return filtered(stale)

        raise

    # STEP 3: Normalize and deduplicate.

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

    # STEP 4: Store results in cache.

    entry = {
        "bounds": (south, west, north, east),
        "places": places,
    }

    cache.set(
        cache_key,
        entry,
        CACHE_TIMEOUT,
    )

    cache.set(
        stale_key,
        entry,
        STALE_CACHE_TIMEOUT,
    )

    return places[:MAX_RESULTS]


# ============================================================
# BUILD OFFICIAL OSM API URL
# ============================================================

def build_osm_api_url(osm_type, osm_id, full=False):
    osm_type, osm_id = validate_osm_identifier(
        osm_type, osm_id
    )

    url = f"{OSM_API_URL}/{osm_type}/{osm_id}"

    if full and osm_type in ("way", "relation"):
        url += "/full"

    # Important: Always request JSON because
    # request_json() expects JSON, not XML.
    return url + ".json"


# ============================================================
# CALCULATE GEOMETRY CENTER
# ============================================================

def calculate_geometry_center(coordinates):
    """
    Calculate a representative center from coordinates.

    Use a circular mean for longitude to handle
    geographic coordinates near the antimeridian.
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
            latitude, longitude
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
        latitude, longitude
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
    Nodes have direct coordinates.
    Ways use referenced nodes.
    Relations use member nodes and ways.
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
    Verify an OSM place using the official OSM API.

    If a way or relation has no direct center,
    fetch its full geometry and calculate a center.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type, osm_id
    )

    url = build_osm_api_url(
        osm_type, osm_id
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
    Verify an individual OSM place.

    Successful results are cached for 24 hours.
    Missing places are cached for 5 minutes.
    """

    osm_type, osm_id = validate_osm_identifier(
        osm_type, osm_id
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
        osm_type, osm_id
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
