import { useState } from "react";

function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setLocation({
          latitude,
          longitude,
          accuracy,
        });

        setLoading(false);
      },
      (error) => {
        setLoading(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Location permission was denied.");
            break;

          case error.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;

          case error.TIMEOUT:
            setError("Location request timed out.");
            break;

          default:
            setError("Unable to get your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000,
      }
    );
  };

  return {
    location,
    loading,
    error,
    getCurrentLocation,
  };
}

export default useLocation;