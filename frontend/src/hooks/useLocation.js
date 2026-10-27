
import { useCallback, useEffect, useRef, useState } from "react";

function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const pendingRequestRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (pendingRequestRef.current) {
      return pendingRequestRef.current;
    }

    if (!navigator.geolocation) {
      const message = "Geolocation is not supported by this browser.";

      if (mountedRef.current) {
        setError(message);
        setLoading(false);
      }

      return Promise.resolve(null);
    }

    setLoading(true);
    setError("");

    const request = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading, speed } =
            position.coords;

          const coordinates = {
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
            timestamp: position.timestamp,
          };

          if (mountedRef.current) {
            setLocation(coordinates);
            setLoading(false);
          }

          resolve(coordinates);
        },
        (geoError) => {
          let message;

          switch (geoError.code) {
            case 1:
              message = "Location permission was denied.";
              break;
            case 2:
              message = "Location information is unavailable.";
              break;
            case 3:
              message = "Location request timed out.";
              break;
            default:
              message = "Unable to get your location.";
          }

          if (mountedRef.current) {
            setError(message);
            setLoading(false);
          }

          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000,
        }
      );
    });

    pendingRequestRef.current = request;

    request.finally(() => {
      if (pendingRequestRef.current === request) {
        pendingRequestRef.current = null;
      }
    });

    return request;
  }, []);

  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      if (mountedRef.current) {
        setError("Geolocation is not supported by this browser.");
      }
      return;
    }

    // Avoid creating multiple watchers.
    if (watchIdRef.current !== null) {
      return;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError("");
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } =
          position.coords;

        const coordinates = {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          timestamp: position.timestamp,
        };

        if (mountedRef.current) {
          setLocation(coordinates);
          setLoading(false);
          setError("");
        }
      },
      (geoError) => {
        let message;

        switch (geoError.code) {
          case 1:
            message = "Location permission was denied.";
            break;
          case 2:
            message = "Location information is unavailable.";
            break;
          case 3:
            message = "Location request timed out.";
            break;
          default:
            message = "Unable to get your location.";
        }

        if (mountedRef.current) {
          setError(message);
          setLoading(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 1000,
      }
    );
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startWatchingLocation,
    stopWatchingLocation,
  };
}

export default useLocation;
