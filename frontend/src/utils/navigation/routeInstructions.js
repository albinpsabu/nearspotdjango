
/**
 * Extract turn-by-turn navigation instructions
 * from an OpenRouteService GeoJSON response.
 *
 * GeoJSON coordinates use:
 * [longitude, latitude]
 */

export function extractRouteInstructions(route) {
  const feature = route?.features?.[0];

  const coordinates = feature?.geometry?.coordinates;
  const segments = feature?.properties?.segments;

  if (!Array.isArray(coordinates)) {
    return [];
  }

  if (!Array.isArray(segments)) {
    return [];
  }

  const instructions = [];

  for (const segment of segments) {
    if (!Array.isArray(segment.steps)) {
      continue;
    }

    for (const step of segment.steps) {
      const waypointIndex = step.way_points?.[0];

      const coordinate = coordinates[waypointIndex];

      if (
        !Array.isArray(coordinate) ||
        coordinate.length < 2
      ) {
        continue;
      }

      const [longitude, latitude] = coordinate;

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        continue;
      }

      instructions.push({
        id: instructions.length,

        instruction:
          step.instruction || "Continue on route",

        roadName: step.name || "",

        distance: Number(step.distance) || 0,

        duration: Number(step.duration) || 0,

        type: step.type,

        latitude,
        longitude,

        startWaypointIndex: waypointIndex,

        endWaypointIndex:
          step.way_points?.[1] ?? waypointIndex,
      });
    }
  }

  return instructions;
}

/**
 * Format distance for display.
 */
export function formatNavigationDistance(distance) {
  if (
    !Number.isFinite(distance) ||
    distance < 0
  ) {
    return "--";
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

/**
 * Select a Bootstrap icon based on
 * OpenRouteService instruction type.
 */
export function getTurnIcon(type) {
  switch (type) {
    case 0:
    case 1:
    case 2:
      return "bi-arrow-up-right";

    case 4:
    case 5:
    case 6:
      return "bi-arrow-up-left";

    case 3:
    case 7:
      return "bi-arrow-up";

    case 8:
      return "bi-arrow-90deg-left";

    case 9:
      return "bi-arrow-90deg-right";

    case 10:
      return "bi-geo-alt-fill";

    case 11:
      return "bi-arrow-up";

    default:
      return "bi-sign-turn-right";
  }
}
