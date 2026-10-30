
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// GPS CONFIGURATION
// ============================================================

const MAX_ACCEPTABLE_ACCURACY_METERS = 100;
const MAX_LOCATION_AGE_MS = 20_000;
const FUTURE_TIMESTAMP_TOLERANCE_MS = 5_000;

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 1_000,
};

// Always request a fresh device reading for spot submission.
const FRESH_GPS_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

// ============================================================
// HELPERS
// ============================================================

function getGeolocationErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return "Location permission was denied. Allow location access in your browser settings.";
    case 2:
      return "Location information is unavailable. Check your device's location services.";
    case 3:
      return "Location request timed out. Try again in an area with a better GPS signal.";
    default:
      return "Unable to get your location.";
  }
}

function validatePosition(position) {
  if (!position?.coords) {
    return {
      valid: false,
      message: "The GPS provider returned an invalid position.",
    };
  }

  const {
    latitude,
    longitude,
    accuracy,
    heading,
    speed,
  } = position.coords;

  const timestamp = Number(position.timestamp);
  const now = Date.now();

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      valid: false,
      message: "The GPS provider returned invalid coordinates.",
    };
  }

  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return {
      valid: false,
      message: "GPS accuracy is unavailable. Please try again.",
    };
  }

  if (accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    return {
      valid: false,
      message:
        `GPS accuracy is too low (${Math.round(accuracy)} m). ` +
        "Move to an area with a clearer view of the sky and try again.",
    };
  }

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0 ||
    timestamp > now + FUTURE_TIMESTAMP_TOLERANCE_MS ||
    now - timestamp > MAX_LOCATION_AGE_MS
  ) {
    return {
      valid: false,
      message: "The GPS reading is outdated. Please try again.",
    };
  }

  return {
    valid: true,
    location: {
      latitude,
      longitude,
      accuracy,
      heading:
        Number.isFinite(heading) && heading >= 0 && heading < 360
          ? heading
          : null,
      speed:
        Number.isFinite(speed) && speed >= 0
          ? speed
          : null,
      timestamp,
    },
  };
}

// ============================================================
// HOOK
// ============================================================

function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Independent state for GPS-only spot submission.
  const [freshLocationLoading, setFreshLocationLoading] =
    useState(false);
  const [freshLocationError, setFreshLocationError] =
    useState("");

  const mountedRef = useRef(false);
  const pendingRequestRef = useRef(null);
  const freshRequestRef = useRef(null);
  const watchIdRef = useRef(null);
  const latestTimestampRef = useRef(0);

  // ----------------------------------------------------------
  // LIFECYCLE AND CLEANUP
  // ----------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (
        watchIdRef.current !== null &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // ----------------------------------------------------------
  // PROCESS A GPS POSITION FOR MAP LOCATION
  // ----------------------------------------------------------

  const processPosition = useCallback((position) => {
    const result = validatePosition(position);

    if (!mountedRef.current) {
      return result.valid ? result.location : null;
    }

    if (!result.valid) {
      setLocation(null);
      setError(result.message);
      setLoading(false);
      return null;
    }

    const nextLocation = result.location;

    if (nextLocation.timestamp < latestTimestampRef.current) {
      return null;
    }

    latestTimestampRef.current = nextLocation.timestamp;

    setLocation(nextLocation);
    setError("");
    setLoading(false);

    return nextLocation;
  }, []);

  // ----------------------------------------------------------
  // GET CURRENT LOCATION FOR MAP USE
  // ----------------------------------------------------------

  const getCurrentLocation = useCallback(() => {
    if (pendingRequestRef.current) {
      return pendingRequestRef.current;
    }

    if (!navigator.geolocation) {
      const message =
        "Geolocation is not supported by this browser.";

      if (mountedRef.current) {
        setError(message);
        setLoading(false);
      }

      return Promise.resolve(null);
    }

    if (mountedRef.current) {
      setLoading(true);
      setError("");
    }

    const request = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(processPosition(position)),
        (geoError) => {
          if (mountedRef.current) {
            setError(getGeolocationErrorMessage(geoError));
            setLoading(false);

            if (geoError.code === 1) {
              setLocation(null);
            }
          }

          resolve(null);
        },
        GEOLOCATION_OPTIONS
      );
    });

    pendingRequestRef.current = request;

    request.then(() => {
      if (pendingRequestRef.current === request) {
        pendingRequestRef.current = null;
      }
    });

    return request;
  }, [processPosition]);

  // ----------------------------------------------------------
  // GET A FRESH GPS READING FOR SPOT SUBMISSION
  // ----------------------------------------------------------

  const getFreshLocation = useCallback(() => {
    // Avoid duplicate submission-location requests.
    if (freshRequestRef.current) {
      return freshRequestRef.current;
    }

    if (!navigator.geolocation) {
      const message =
        "Geolocation is not supported by this browser.";

      if (mountedRef.current) {
        setFreshLocationError(message);
        setFreshLocationLoading(false);
      }

      return Promise.resolve(null);
    }

    if (mountedRef.current) {
      setFreshLocationLoading(true);
      setFreshLocationError("");
    }

    const request = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = validatePosition(position);

          if (mountedRef.current) {
            setFreshLocationLoading(false);
            setFreshLocationError(
              result.valid ? "" : result.message
            );
          }

          // Do not change the map's location state.
          resolve(result.valid ? result.location : null);
        },
        (geoError) => {
          const message = getGeolocationErrorMessage(geoError);

          if (mountedRef.current) {
            setFreshLocationLoading(false);
            setFreshLocationError(message);
          }

          resolve(null);
        },
        FRESH_GPS_OPTIONS
      );
    });

    freshRequestRef.current = request;

    request.then(() => {
      if (freshRequestRef.current === request) {
        freshRequestRef.current = null;
      }
    });

    return request;
  }, []);

  // ----------------------------------------------------------
  // START CONTINUOUS LOCATION WATCHING
  // ----------------------------------------------------------

  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      if (mountedRef.current) {
        setError(
          "Geolocation is not supported by this browser."
        );
        setLoading(false);
      }
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError("");
    }

    const watchId = navigator.geolocation.watchPosition(
      processPosition,
      (geoError) => {
        if (!mountedRef.current) return;

        setError(getGeolocationErrorMessage(geoError));
        setLoading(false);

        if (geoError.code === 1) {
          if (watchIdRef.current !== null) {
            navigator.geolocation?.clearWatch(
              watchIdRef.current
            );
            watchIdRef.current = null;
          }

          setLocation(null);
        }
      },
      GEOLOCATION_OPTIONS
    );

    watchIdRef.current = watchId;
  }, [processPosition]);

  // ----------------------------------------------------------
  // STOP CONTINUOUS LOCATION WATCHING
  // ----------------------------------------------------------

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (mountedRef.current) {
      setLoading(false);
    }
  }, []);

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startWatchingLocation,
    stopWatchingLocation,

    // Dedicated GPS API for HiddenSpot submission.
    getFreshLocation,
    freshLocationLoading,
    freshLocationError,
  };
}

export default useLocation;
