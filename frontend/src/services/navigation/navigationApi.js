
import api from "../api";

/**
 * Fetch available travel modes from Django.
 *
 * GET /navigation/travel-modes/
 */
export async function getTravelModes({ signal } = {}) {
  const response = await api.get(
    "/navigation/travel-modes/",
    { signal }
  );

  if (!Array.isArray(response.data)) {
    throw new Error("Invalid travel modes response from server.");
  }

  return response.data;
}

/**
 * Calculate a navigation route.
 *
 * POST /navigation/routes/
 */
export async function calculateRoute(routeData, { signal } = {}) {
  const response = await api.post(
    "/navigation/routes/",
    routeData,
    { signal }
  );

  return response.data;
}
