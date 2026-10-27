
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// CONFIGURATION
// ============================================================

const GPS_TIMEOUT_MS = 15000;
const GPS_STALE_AFTER_MS = 20000;
const GPS_CHECK_INTERVAL_MS = 5000;
const MAX_ACCEPTABLE_ACCURACY_METERS = 100;

// ============================================================
// GPS ERROR HANDLING
// ============================================================

function getLocationError(error) {
  switch (error?.code) {
    case 1:
      return "Location permission was denied. Enable location access to continue navigation.";

    case 2:
      return "Your current location is unavailable. Waiting for GPS signal.";

    case 3:
      return "Getting your location timed out. Waiting for another GPS update.";

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

  const sessionRef = useRef(0);

  const trackingRef = useRef(false);

  const lastUpdateRef = useRef(null);

  const gpsCheckIntervalRef = useRef(null);

  // ----------------------------------------------------------
  // CLEAR GPS MONITOR
  // ----------------------------------------------------------

  const clearGpsMonitor = useCallback(() => {
    if (gpsCheckIntervalRef.current !== null) {
      clearInterval(gpsCheckIntervalRef.current);

      gpsCheckIntervalRef.current = null;
    }
  }, []);

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

    clearGpsMonitor();

    trackingRef.current = false;

    lastUpdateRef.current = null;

    setIsTracking(false);

    setCurrentLocation(null);

    setLocationError("");
  }, [clearGpsMonitor]);

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

      setIsTracking(false);

      return;
    }

    // Start a new tracking session.
    const sessionId = ++sessionRef.current;

    trackingRef.current = true;

    lastUpdateRef.current = Date.now();

    setCurrentLocation(null);

    setIsTracking(true);

    setLocationError("");

    // --------------------------------------------------------
    // GPS SIGNAL MONITOR
    // --------------------------------------------------------

    clearGpsMonitor();

    gpsCheckIntervalRef.current = setInterval(() => {
      if (
        sessionId !== sessionRef.current ||
        !trackingRef.current
      ) {
        return;
      }

      const lastUpdate = lastUpdateRef.current;

      if (!lastUpdate) {
        return;
      }

      const elapsedTime = Date.now() - lastUpdate;

      if (elapsedTime > GPS_STALE_AFTER_MS) {
        setLocationError(
          "GPS signal lost or delayed. Waiting for a new location update."
        );

        // Prevent navigation from using stale coordinates.
        setCurrentLocation(null);
      }
    }, GPS_CHECK_INTERVAL_MS);

    // --------------------------------------------------------
    // WATCH GPS POSITION
    // --------------------------------------------------------

    try {
      const watchId = navigator.geolocation.watchPosition(
        // ----------------------------------------------------
        // GPS SUCCESS
        // ----------------------------------------------------

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
            !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180
          ) {
            setLocationError(
              "Invalid GPS coordinates received."
            );

            setCurrentLocation(null);

            return;
          }

          if (
            !Number.isFinite(accuracy) ||
            accuracy < 0 ||
            accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
          ) {
            setLocationError(
              "GPS accuracy is currently poor. Waiting for a more accurate location."
            );

            // Keep the last valid position while waiting
            // for a more accurate GPS update.
            return;
          }

          const timestamp = Number(position.timestamp);

          const now = Date.now();

          if (
            !Number.isFinite(timestamp) ||
            timestamp > now ||
            now - timestamp > GPS_STALE_AFTER_MS
          ) {
            setLocationError(
              "Received an outdated GPS position. Waiting for a fresh update."
            );

            setCurrentLocation(null);

            return;
          }

          // A reliable position has been received.
          lastUpdateRef.current = now;

          setCurrentLocation({
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
            timestamp,
          });

          setLocationError("");
        },

        // ----------------------------------------------------
        // GPS ERROR
        // ----------------------------------------------------

        (error) => {
          if (sessionId !== sessionRef.current) {
            return;
          }

          const message = getLocationError(error);

          // Permission denied: end the tracking session.
          if (error?.code === 1) {
            stopTracking();

            setLocationError(message);

            return;
          }

          // Temporary GPS errors do not stop watchPosition.
          // Keep the last valid position temporarily while
          // waiting for another update. The stale-location
          // monitor will clear it if updates do not resume.
          setLocationError(message);
        },

        // ----------------------------------------------------
        // GPS OPTIONS
        // ----------------------------------------------------

        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: GPS_TIMEOUT_MS,
        }
      );

      watchIdRef.current = watchId;
    } catch (error) {
      stopTracking();

      setLocationError(getLocationError(error));
    }
  }, [clearGpsMonitor, stopTracking]);

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

      clearGpsMonitor();

      trackingRef.current = false;
    };
  }, [clearGpsMonitor]);

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
