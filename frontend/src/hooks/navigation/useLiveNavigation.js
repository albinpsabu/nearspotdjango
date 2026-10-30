
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
      return error?.message || "Unable to track your current location.";
  }
}

// ============================================================
// LIVE NAVIGATION HOOK
// ============================================================

export default function useLiveNavigation() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState("");

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
      navigator.geolocation?.clearWatch(watchIdRef.current);
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
    if (trackingRef.current) return;

    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      setIsTracking(false);
      return;
    }

    const sessionId = ++sessionRef.current;

    trackingRef.current = true;
    lastUpdateRef.current = null;

    setCurrentLocation(null);
    setIsTracking(true);
    setLocationError("");

    clearGpsMonitor();

    // --------------------------------------------------------
    // GPS STALE-LOCATION MONITOR
    // --------------------------------------------------------

    gpsCheckIntervalRef.current = setInterval(() => {
      if (
        sessionId !== sessionRef.current ||
        !trackingRef.current
      ) {
        return;
      }

      const lastUpdate = lastUpdateRef.current;

      if (
        lastUpdate === null ||
        Date.now() - lastUpdate > GPS_STALE_AFTER_MS
      ) {
        setCurrentLocation(null);

        setLocationError(
          "GPS signal lost or delayed. Waiting for a new location update."
        );
      }
    }, GPS_CHECK_INTERVAL_MS);

    // --------------------------------------------------------
    // WATCH GPS POSITION
    // --------------------------------------------------------

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (
            sessionId !== sessionRef.current ||
            !trackingRef.current
          ) {
            return;
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

          // Validate coordinates.
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180
          ) {
            lastUpdateRef.current = null;
            setCurrentLocation(null);
            setLocationError("Invalid GPS coordinates received.");
            return;
          }

          // Reject inaccurate or invalid GPS readings.
          if (
            !Number.isFinite(accuracy) ||
            accuracy <= 0 ||
            accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
          ) {
            setCurrentLocation(null);

            setLocationError(
              "GPS accuracy is currently poor. Waiting for a more accurate location."
            );
            return;
          }

          // Reject outdated or invalid timestamps.
          if (
            !Number.isFinite(timestamp) ||
            timestamp <= 0 ||
            timestamp > now ||
            now - timestamp > GPS_STALE_AFTER_MS
          ) {
            setCurrentLocation(null);

            setLocationError(
              "Received an outdated GPS position. Waiting for a fresh update."
            );
            return;
          }

          // Accept the new GPS position.
          lastUpdateRef.current = now;

          setCurrentLocation({
            latitude,
            longitude,
            accuracy,
            heading:
              Number.isFinite(heading) ? heading : null,
            speed:
              Number.isFinite(speed) ? speed : null,
            timestamp,
          });

          setLocationError("");
        },

        (error) => {
          if (
            sessionId !== sessionRef.current ||
            !trackingRef.current
          ) {
            return;
          }

          const message = getLocationError(error);

          if (error?.code === 1) {
            stopTracking();
            setLocationError(message);
            return;
          }

          // Do not keep showing an old position after a GPS error.
          setCurrentLocation(null);
          setLocationError(message);
        },

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
  // CLEANUP ON UNMOUNT
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
