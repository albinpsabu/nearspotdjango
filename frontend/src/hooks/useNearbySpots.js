
import { useEffect, useState } from "react";

import api from "../services/api";

// ============================================================
// CONFIGURATION
// ============================================================

const DEBOUNCE_DELAY = 300;

// ============================================================
// NEARBY SPOTS HOOK
// ============================================================

function useNearbySpots(location, radius) {
  // ============================================================
  // STATE
  // ============================================================

  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // COORDINATES
  // ============================================================

  const latitude = location?.latitude;
  const longitude = location?.longitude;

  // ============================================================
  // FETCH NEARBY SPOTS
  // ============================================================

  useEffect(() => {
    // Validate coordinates and radius before requesting.
    const validLocation =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    const validRadius =
      Number.isFinite(radius) && radius > 0;

    if (!validLocation || !validRadius) {
      setSpots([]);
      setLoading(false);
      setError("");
      return;
    }

    // Cancel the previous request when dependencies change.
    const controller = new AbortController();

    let active = true;

    // Clear results from the previous search.
    setSpots([]);
    setLoading(true);
    setError("");

    // ========================================================
    // API REQUEST
    // ========================================================

    const fetchNearbySpots = async () => {
      try {
        const response = await api.get("/spots/nearby/", {
          params: {
            latitude,
            longitude,
            radius,
          },
          signal: controller.signal,
        });

        if (!active) return;

        // Accept an array of spots from the API.
        setSpots(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (err) {
        // Ignore requests canceled by location/radius changes.
        if (
          !active ||
          controller.signal.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error("Nearby spots error:", err);

        setError("Unable to load nearby spots.");
        setSpots([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Debounce requests to reduce unnecessary API traffic.
    const timeoutId = setTimeout(
      fetchNearbySpots,
      DEBOUNCE_DELAY
    );

    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [latitude, longitude, radius]);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    spots,
    loading,
    error,
  };
}

export default useNearbySpots;
