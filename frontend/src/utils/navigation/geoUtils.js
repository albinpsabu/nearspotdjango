
const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Calculate distance between two GPS coordinates.
export function getDistanceMeters(pointA, pointB) {
  const lat1 = toRadians(Number(pointA.latitude));
  const lat2 = toRadians(Number(pointB.latitude));

  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(
    Number(pointB.longitude) - Number(pointA.longitude)
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
  );
}

// Calculate shortest distance from a GPS point
// to a route segment using a local metre projection.
function distanceToSegment(point, start, end) {
  const referenceLatitude = toRadians(point.latitude);

  function project(coordinate) {
    return {
      x:
        EARTH_RADIUS_METERS *
        toRadians(coordinate.longitude - point.longitude) *
        Math.cos(referenceLatitude),
      y:
        EARTH_RADIUS_METERS *
        toRadians(coordinate.latitude - point.latitude),
    };
  }

  const a = project(start);
  const b = project(end);

  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(a.x, a.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      -(a.x * dx + a.y * dy) / lengthSquared
    )
  );

  return Math.hypot(
    a.x + t * dx,
    a.y + t * dy
  );
}

// Find the minimum distance between the user's GPS
// position and the route's GeoJSON LineString.
export function getDistanceFromRoute(location, route) {
  if (!location || !route) {
    return null;
  }

  const point = {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  };

  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude)
  ) {
    return null;
  }

  const coordinates =
    route?.features?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  let minimumDistance = Infinity;

  for (let index = 0; index < coordinates.length - 1; index++) {
    const [startLongitude, startLatitude] = coordinates[index];
    const [endLongitude, endLatitude] = coordinates[index + 1];

    if (
      ![
        startLongitude,
        startLatitude,
        endLongitude,
        endLatitude,
      ].every(Number.isFinite)
    ) {
      continue;
    }

    const distance = distanceToSegment(
      point,
      {
        latitude: startLatitude,
        longitude: startLongitude,
      },
      {
        latitude: endLatitude,
        longitude: endLongitude,
      }
    );

    minimumDistance = Math.min(minimumDistance, distance);
  }

  return Number.isFinite(minimumDistance)
    ? minimumDistance
    : null;
}
