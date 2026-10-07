import { useEffect, useState } from "react";

import api from "../services/api";

function useNearbySpots(location, radius) {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!location) {
      
      return;
    }

    const fetchNearbySpots = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/spots/nearby/", {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: radius,
          },
        });

        setSpots(response.data);
      } catch (err) {
        console.error("Nearby spots error:", err);

        setError("Unable to load nearby spots.");
        setSpots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbySpots();
  }, [location, radius]);

  return {
    spots,
    loading,
    error,
  };
}

export default useNearbySpots;