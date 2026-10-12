
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Support normal arrays and common DRF response formats.
function parseReviewResponse(data) {
  if (Array.isArray(data)) {
    return { reviews: data, next: null };
  }

  if (Array.isArray(data?.results)) {
    return {
      reviews: data.results,
      next: data.next || null,
    };
  }

  if (Array.isArray(data?.reviews)) {
    return {
      reviews: data.reviews,
      next: data.next || null,
    };
  }

  throw new Error("Unexpected reviews response format.");
}

// Fetch every page, if the backend uses pagination.
async function fetchAllReviews(initialUrl, signal) {
  const allReviews = [];
  const visitedUrls = new Set();
  let nextUrl = initialUrl;

  while (nextUrl) {
    if (visitedUrls.has(nextUrl)) {
      throw new Error("Repeated pagination URL detected.");
    }

    visitedUrls.add(nextUrl);

    const response = await api.get(nextUrl, { signal });
    const { reviews, next } = parseReviewResponse(response.data);

    allReviews.push(...reviews);
    nextUrl = next;
  }

  return allReviews;
}

// Convert HiddenSpot reviews to a shared display format.
function normalizeHiddenReview(review) {
  return {
    ...review,
    review_type: "hidden",
    review_key: `hidden-${review.id}`,
    spot_name: review.spot_name || "Unnamed spot",
    spot_category: review.spot_category || "",
    media: Array.isArray(review.media) ? review.media : [],
  };
}

// Convert external OSM reviews to the same display format.
function normalizeExternalReview(review) {
  const place =
    review.place && typeof review.place === "object"
      ? review.place
      : {};

  return {
    ...review,
    review_type: "external",
    review_key: `external-${review.id}`,
    spot_name:
      review.place_name ||
      review.external_place_name ||
      place.name ||
      "Unnamed external place",
    spot_category:
      review.place_category ||
      review.external_place_category ||
      place.category ||
      "",
    media: [],
  };
}

export function useMyReviews() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef(null);

  const fetchMyReviews = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;

    // Cancel any previous unfinished request.
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setError("");

    try {
      // Fetch the two independent review sources.
      const [hiddenResult, externalResult] =
        await Promise.allSettled([
          fetchAllReviews(
            "/spots/my-reviews/",
            controller.signal
          ),
          fetchAllReviews(
            "/spots/external/reviews/my/",
            controller.signal
          ),
        ]);

      if (controller.signal.aborted) return;

      const hiddenReviews =
        hiddenResult.status === "fulfilled"
          ? hiddenResult.value.map(normalizeHiddenReview)
          : [];

      const externalReviews =
        externalResult.status === "fulfilled"
          ? externalResult.value.map(normalizeExternalReview)
          : [];

      // Merge and sort newest first.
      const combinedReviews = [
        ...hiddenReviews,
        ...externalReviews,
      ].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      setReviews(combinedReviews);

      // Keep successfully loaded reviews even if
      // one of the two endpoints fails.
      const failedSources = [];

      if (hiddenResult.status === "rejected") {
        console.error(
          "Failed to fetch HiddenSpot reviews:",
          hiddenResult.reason
        );
        failedSources.push("HiddenSpot");
      }

      if (externalResult.status === "rejected") {
        console.error(
          "Failed to fetch external place reviews:",
          externalResult.reason
        );
        failedSources.push("external place");
      }

      if (failedSources.length > 0) {
        setError(
          `Unable to load ${failedSources.join(
            " and "
          )} reviews. Some reviews may be missing.`
        );
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      console.error("Fetch my reviews error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load your reviews. Please try again."
      );

      setReviews([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchMyReviews();
    } else if (!authLoading && !isAuthenticated) {
      setReviews([]);
      setError("");
      requestRef.current?.abort();
    }

    return () => {
      requestRef.current?.abort();
    };
  }, [authLoading, isAuthenticated, fetchMyReviews]);

  return {
    reviews,
    loading,
    error,
    fetchMyReviews,
  };
}
