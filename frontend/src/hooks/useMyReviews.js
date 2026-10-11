
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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
      const allReviews = [];
      const visitedUrls = new Set();
      let nextUrl = "/spots/my-reviews/";

      // Support both normal and paginated DRF responses.
      while (nextUrl) {
        if (visitedUrls.has(nextUrl)) {
          throw new Error("Repeated pagination URL detected.");
        }

        visitedUrls.add(nextUrl);

        const response = await api.get(nextUrl, {
          signal: controller.signal,
        });

        const data = response.data;

        if (Array.isArray(data)) {
          allReviews.push(...data);
          nextUrl = null;
        } else if (Array.isArray(data?.results)) {
          allReviews.push(...data.results);
          nextUrl = data.next || null;
        } else {
          throw new Error("Unexpected reviews response.");
        }
      }

      // Show newest reviews first.
      allReviews.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      if (!controller.signal.aborted) {
        setReviews(allReviews);
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
