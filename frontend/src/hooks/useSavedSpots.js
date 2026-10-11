import { useState, useCallback, useEffect } from "react";
import api from "../services/api";
export function useSavedSpots() {
  const [savedSpots, setSavedSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchSavedSpots = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/spots/saved/");
      setSavedSpots(response.data);
    } catch (err) {
      console.error("Fetch saved spots error:", err);
      setError("Unable to load saved spots.");
      setSavedSpots([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchSavedSpots();
  }, [fetchSavedSpots]);
  const saveSpot = async (spotId) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post(`/spots/${spotId}/save/`);
      setSavedSpots((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      console.error("Save spot error:", err);
      const msg = err.response?.data?.detail || "Failed to save spot.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const unsaveSpot = async (spotId) => {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/spots/${spotId}/save/`);
      setSavedSpots((prev) => prev.filter((s) => s.spot !== spotId && s.id !== spotId));
    } catch (err) {
      console.error("Unsave spot error:", err);
      const msg = err.response?.data?.detail || "Failed to unsave spot.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const isSaved = (spotId) => {
    return savedSpots.some((s) => s.spot === spotId || s.id === spotId);
  };
  return {
    savedSpots,
    loading,
    error,
    fetchSavedSpots,
    saveSpot,
    unsaveSpot,
    isSaved,
  };
}