
import { useState, useCallback, useEffect } from "react";
import api from "../services/api";

// Handle standard DRF list and paginated responses.
function parseReviews(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.reviews)) return data.reviews;

  throw new Error("Unexpected reviews response format.");
}

// Extract a readable error message from an API response.
function getErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;

  if (data && typeof data === "object") {
    const firstError = Object.values(data)[0];

    if (Array.isArray(firstError)) {
      return firstError.join(" ");
    }

    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return error.message || "Something went wrong.";
}

// Prepare review data, including optional images/videos.
function buildReviewFormData({
  rating,
  comment,
  mediaFiles = [],
  mediaTypes,
}) {
  const formData = new FormData();

  formData.append("rating", String(rating));
  formData.append("comment", comment || "");

  mediaFiles.forEach((file, index) => {
    const mediaType =
      mediaTypes?.[index] ||
      (file.type.startsWith("video/") ? "VIDEO" : "IMAGE");

    formData.append("media_files", file);
    formData.append("media_types", mediaType);
  });

  return formData;
}

export function useReviews(spotId) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(
    async (signal) => {
      if (!spotId) {
        setReviews([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const allReviews = [];
        const visited = new Set();

        let nextUrl = `/spots/${spotId}/reviews/`;

        while (nextUrl) {
          if (visited.has(nextUrl)) {
            throw new Error("Repeated pagination URL detected.");
          }

          visited.add(nextUrl);

          const response = await api.get(nextUrl, { signal });

          allReviews.push(...parseReviews(response.data));
          nextUrl = response.data?.next || null;
        }

        if (!signal?.aborted) {
          setReviews(allReviews);
        }
      } catch (err) {
        if (signal?.aborted || err.code === "ERR_CANCELED") {
          return;
        }

        console.error("Failed to fetch reviews:", err);
        setError(getErrorMessage(err));
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [spotId]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchReviews(controller.signal);

    return () => controller.abort();
  }, [fetchReviews]);

  const createReview = async (reviewData) => {
    try {
      const formData = buildReviewFormData(reviewData);

      const response = await api.post(
        `/spots/${spotId}/reviews/`,
        formData
      );

      await fetchReviews();
      return response.data;
    } catch (err) {
      console.error("Failed to create review:", err);
      throw new Error(getErrorMessage(err));
    }
  };

  const updateReview = async (reviewId, reviewData) => {
    try {
      const formData = buildReviewFormData(reviewData);

      const response = await api.patch(
        `/spots/${spotId}/reviews/${reviewId}/`,
        formData
      );

      await fetchReviews();
      return response.data;
    } catch (err) {
      console.error("Failed to update review:", err);
      throw new Error(getErrorMessage(err));
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await api.delete(
        `/spots/${spotId}/reviews/${reviewId}/`
      );

      await fetchReviews();
    } catch (err) {
      console.error("Failed to delete review:", err);
      throw new Error(getErrorMessage(err));
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
