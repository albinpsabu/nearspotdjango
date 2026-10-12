
import { useCallback, useEffect, useRef, useState } from "react";

function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const pendingRequestRef = useRef(null);

  // Ignore geolocation callbacks after unmounting.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCurrentLocation = useCallback(() => {
    // Reuse an ongoing request instead of starting another.
    if (pendingRequestRef.current) {
      return pendingRequestRef.current;
    }

    if (!navigator.geolocation) {
      const message = "Geolocation is not supported by this browser.";

      setError(message);
      return Promise.resolve(null);
    }

    setLoading(true);
    setError("");

    const request = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          const coordinates = {
            latitude,
            longitude,
            accuracy,
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
          timeout: 30000,
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

  return {
    location,
    loading,
    error,
    getCurrentLocation,
  };
}

export default useLocation;
