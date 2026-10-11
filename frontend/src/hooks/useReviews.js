import { useState, useCallback } from "react";
import api from "../services/api";
export function useReviews(spotId) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchReviews = useCallback(async () => {
    if (!spotId) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/spots/${spotId}/reviews/`);
      setReviews(response.data);
    } catch (err) {
      console.error("Fetch reviews error:", err);
      setError("Unable to load reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [spotId]);
  const createReview = async ({ rating, comment, mediaFiles = [], mediaTypes = [] }) => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("rating", rating);
      if (comment) formData.append("comment", comment);
      mediaFiles.forEach((file) => formData.append("media_files", file));
      mediaTypes.forEach((type) => formData.append("media_types", type));
      const response = await api.post(`/spots/${spotId}/reviews/`, formData);
      setReviews((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      console.error("Create review error:", err);
      const msg = err.response?.data?.detail || err.response?.data?.rating?.[0] || "Failed to create review.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const updateReview = async (reviewId, { rating, comment, mediaFiles = [], mediaTypes = [] }) => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      if (rating !== undefined) formData.append("rating", rating);
      if (comment !== undefined) formData.append("comment", comment);
      mediaFiles.forEach((file) => formData.append("media_files", file));
      mediaTypes.forEach((type) => formData.append("media_types", type));
      const response = await api.patch(`/spots/${spotId}/reviews/${reviewId}/`, formData);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? response.data : r)));
      return response.data;
    } catch (err) {
      console.error("Update review error:", err);
      const msg = err.response?.data?.detail || "Failed to update review.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const deleteReview = async (reviewId) => {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/spots/${spotId}/reviews/${reviewId}/`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error("Delete review error:", err);
      const msg = err.response?.data?.detail || "Failed to delete review.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  return {
    reviews,
    loading,
    error,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
  };
}