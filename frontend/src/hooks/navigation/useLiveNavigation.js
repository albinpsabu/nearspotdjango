
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// GPS ERROR HANDLING
// ============================================================

function getLocationError(error) {
  switch (error?.code) {
    case 1:
      return "Location permission was denied.";

    case 2:
      return "Your current location is unavailable.";

    case 3:
      return "Getting your location timed out.";

    default:
      return (
        error?.message ||
        "Unable to track your current location."
      );
  }
}

// ============================================================
// LIVE NAVIGATION HOOK
// ============================================================

export default function useLiveNavigation() {
  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [currentLocation, setCurrentLocation] = useState(null);

  const [isTracking, setIsTracking] = useState(false);

  const [locationError, setLocationError] = useState("");

  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const watchIdRef = useRef(null);

  // Used to ignore callbacks from an old tracking session.
  const sessionRef = useRef(0);

  // Prevent duplicate tracking sessions.
  const trackingRef = useRef(false);

  // ----------------------------------------------------------
  // STOP LIVE TRACKING
  // ----------------------------------------------------------

  const stopTracking = useCallback(() => {
    sessionRef.current += 1;

    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    trackingRef.current = false;

    setIsTracking(false);
  }, []);

  // ----------------------------------------------------------
  // START LIVE TRACKING
  // ----------------------------------------------------------

  const startTracking = useCallback(() => {
    if (trackingRef.current) {
      return;
    }

    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    // Start a new tracking session.
    const sessionId = ++sessionRef.current;

    trackingRef.current = true;

    setLocationError("");

    const watchId = navigator.geolocation.watchPosition(
      // ------------------------------------------------------
      // GPS SUCCESS
      // ------------------------------------------------------

      (position) => {
        if (sessionId !== sessionRef.current) {
          return;
        }

        const {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
        } = position.coords;

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return;
        }

        setCurrentLocation({
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          timestamp: position.timestamp,
        });

        setLocationError("");
      },

      // ------------------------------------------------------
      // GPS ERROR
      // ------------------------------------------------------

      (error) => {
        if (sessionId !== sessionRef.current) {
          return;
        }

        setLocationError(getLocationError(error));

        // Permission denied: stop the tracking session.
        if (error.code === 1) {
          stopTracking();
        }
      },

      // ------------------------------------------------------
      // GPS OPTIONS
      // ------------------------------------------------------

      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;

    setIsTracking(true);
  }, [stopTracking]);

  // ----------------------------------------------------------
  // CLEANUP ON COMPONENT UNMOUNT
  // ----------------------------------------------------------

  useEffect(() => {
    return () => {
      sessionRef.current += 1;

      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }

      trackingRef.current = false;
    };
  }, []);

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {
    currentLocation,
    isTracking,
    locationError,
    startTracking,
    stopTracking,
  };
}
