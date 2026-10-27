import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid #e8efec",
  boxShadow: "0 4px 20px rgba(20, 50, 45, 0.04)",
  backgroundColor: "#ffffff",
};

const statusStyles = {
  PENDING: {
    backgroundColor: "#fff5df",
    color: "#946c00",
    icon: "bi-clock-history",
  },
  APPROVED: {
    backgroundColor: "#e6faf4",
    color: "#087f68",
    icon: "bi-check-circle",
  },
  REJECTED: {
    backgroundColor: "#fdeced",
    color: "#c64d55",
    icon: "bi-x-circle",
  },
  CANCELLED: {
    backgroundColor: "#edf1f1",
    color: "#536365",
    icon: "bi-slash-circle",
  },
};

const getStatus = (status) =>
  String(status || "UNKNOWN").toUpperCase();

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function MySubmissions() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef(null);
  const requestIdRef = useRef(0);

  // Fetch submissions from Django.
  const fetchSubmissions = useCallback(async () => {
    if (!isAuthenticated) return;

    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const allSpots = [];
      const visitedUrls = new Set();

      let nextUrl = "/spots/my/";

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
          allSpots.push(...data);
          nextUrl = null;
        } else if (Array.isArray(data?.results)) {
          allSpots.push(...data.results);
          nextUrl = data.next || null;
        } else {
          throw new Error("Unexpected submissions response.");
        }
      }

      const sortedSpots = allSpots.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      if (
        !controller.signal.aborted &&
        currentRequestId === requestIdRef.current
      ) {
        setSpots(sortedSpots);
      }
    } catch (err) {
      if (
        controller.signal.aborted ||
        currentRequestId !== requestIdRef.current
      ) {
        return;
      }

      console.error("Fetch submissions error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load your submissions. Please try again."
      );
    } finally {
      if (
        !controller.signal.aborted &&
        currentRequestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  // Initial load and request cleanup.
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSubmissions();
    }

    return () => {
      requestRef.current?.abort();
    };
  }, [authLoading, isAuthenticated, fetchSubmissions]);

  // Refresh when the browser tab becomes active.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSubmissions();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("focus", fetchSubmissions);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("focus", fetchSubmissions);
    };
  }, [authLoading, isAuthenticated, fetchSubmissions]);

  // Submission statistics.
  const counts = {
    PENDING: spots.filter(
      (spot) => getStatus(spot.status) === "PENDING"
    ).length,

    APPROVED: spots.filter(
      (spot) => getStatus(spot.status) === "APPROVED"
    ).length,

    REJECTED: spots.filter(
      (spot) => getStatus(spot.status) === "REJECTED"
    ).length,
  };

  const statistics = [
    {
      label: "Total Submissions",
      value: spots.length,
      icon: "bi-geo-alt",
      color: "#087f68",
      background: "#e6faf4",
      description: "All submitted spots",
    },
    {
      label: "Pending Review",
      value: counts.PENDING,
      icon: "bi-clock-history",
      color: "#b78012",
      background: "#fff5df",
      description: "Awaiting verification",
    },
    {
      label: "Approved",
      value: counts.APPROVED,
      icon: "bi-check-circle",
      color: "#168a70",
      background: "#e6faf4",
      description: "Successfully approved",
    },
    {
      label: "Rejected",
      value: counts.REJECTED,
      icon: "bi-x-circle",
      color: "#c64d55",
      background: "#fdeced",
      description: "Not approved",
    },
  ];

  // Authentication loading state.
  if (authLoading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border"
          style={{ color: "#087f68" }}
          role="status"
          aria-label="Loading account"
        />

        <p
          className="mt-3 mb-0"
          style={{ color: "#819092", fontSize: "13px" }}
        >
          Loading your account...
        </p>
      </div>
    );
  }

  // Login required state.
  if (!isAuthenticated) {
    return (
      <div className="py-5">
        <div
          className="card mx-auto text-center"
          style={{
            ...cardStyle,
            maxWidth: "480px",
          }}
        >
          <div className="card-body p-4 p-md-5">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
              style={{
                width: "72px",
                height: "72px",
                backgroundColor: "#e6faf4",
                color: "#087f68",
              }}
            >
              <i
                className="bi bi-person-lock"
                style={{ fontSize: "28px" }}
                aria-hidden="true"
              />
            </div>

            <h5 className="fw-bold mb-2">Login required</h5>

            <p
              className="mb-0"
              style={{
                color: "#819092",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              Please log in to view your submitted hidden spots.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-100" style={{ color: "#1d2b2e" }}>
      {/* Page heading and refresh */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2 mb-3"
            style={{
              backgroundColor: "#e6faf4",
              color: "#087f68",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <i className="bi bi-geo-alt" aria-hidden="true" />
            YOUR CONTRIBUTIONS
          </div>

          <h2
            className="fw-bold mb-2"
            style={{
              fontSize: "clamp(24px, 3vw, 32px)",
              letterSpacing: "-0.8px",
            }}
          >
            My Submissions
          </h2>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            Keep track of the hidden spots you have shared with NearSpot.
          </p>
        </div>

        <button
          type="button"
          className="btn d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold align-self-start align-self-md-center"
          onClick={fetchSubmissions}
          disabled={loading}
          style={{
            color: "#087f68",
            backgroundColor: "#ffffff",
            border: "1px solid #dce9e4",
            borderRadius: "11px",
            fontSize: "13px",
            minHeight: "43px",
          }}
        >
          <i
            className={`bi ${
              loading ? "bi-arrow-repeat" : "bi-arrow-clockwise"
            }`}
            aria-hidden="true"
          />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Statistics cards */}
      <div className="row g-3 g-xl-4 mb-4">
        {statistics.map((item) => (
          <div
            className="col-12 col-sm-6 col-xl-3"
            key={item.label}
          >
            <div className="card h-100" style={cardStyle}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="mb-3 fw-medium"
                      style={{
                        color: "#718184",
                        fontSize: "12px",
                      }}
                    >
                      {item.label}
                    </p>

                    <h2
                      className="fw-bold mb-2"
                      style={{
                        color: "#1d2b2e",
                        fontSize: "clamp(27px, 3vw, 34px)",
                        letterSpacing: "-1px",
                      }}
                    >
                      {loading && spots.length === 0
                        ? "..."
                        : error && spots.length === 0
                        ? "—"
                        : item.value}
                    </h2>

                    <p
                      className="mb-0"
                      style={{
                        color: "#97a4a6",
                        fontSize: "11px",
                        lineHeight: 1.6,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>

                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "13px",
                      backgroundColor: item.background,
                      color: item.color,
                    }}
                  >
                    <i
                      className={`bi ${item.icon}`}
                      aria-hidden="true"
                      style={{ fontSize: "20px" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error and retry */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4"
          role="alert"
        >
          <div className="d-flex align-items-start gap-2">
            <i
              className="bi bi-exclamation-circle mt-1"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger align-self-start align-self-sm-center"
            onClick={fetchSubmissions}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}

      {/* Submissions list */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{
                    width: "38px",
                    height: "38px",
                    backgroundColor: "#e6faf4",
                    color: "#087f68",
                  }}
                >
                  <i className="bi bi-list-ul" aria-hidden="true" />
                </div>

                <h5
                  className="fw-bold mb-0"
                  style={{ fontSize: "17px" }}
                >
                  Submitted Spots
                </h5>
              </div>

              <p
                className="mb-0"
                style={{
                  color: "#819092",
                  fontSize: "12px",
                  lineHeight: 1.7,
                }}
              >
                View the status and details of your submissions.
              </p>
            </div>

            <span
              className="badge rounded-pill px-3 py-2 align-self-start align-self-sm-center"
              style={{
                backgroundColor: "#e6faf4",
                color: "#087f68",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {spots.length} total
            </span>
          </div>

          {/* Loading state */}
          {loading && spots.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{ color: "#087f68" }}
                role="status"
                aria-label="Loading submissions"
              />

              <p
                className="mt-3 mb-0"
                style={{
                  color: "#819092",
                  fontSize: "13px",
                }}
              >
                Loading your submissions...
              </p>
            </div>
          ) : !loading && spots.length === 0 && !error ? (
            /* Empty state */
            <div className="text-center py-5 px-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{
                  width: "76px",
                  height: "76px",
                  backgroundColor: "#e6faf4",
                  color: "#087f68",
                }}
              >
                <i
                  className="bi bi-geo-alt"
                  aria-hidden="true"
                  style={{ fontSize: "31px" }}
                />
              </div>

              <h6 className="fw-bold mb-2">
                No submissions yet
              </h6>

              <p
                className="mx-auto mb-0"
                style={{
                  color: "#819092",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  maxWidth: "420px",
                }}
              >
                Discover a hidden spot and submit it through the NearSpot
                map. Your submissions will appear here.
              </p>
            </div>
          ) : spots.length > 0 ? (
            /* All submitted spots */
            <div className="d-flex flex-column gap-3">
              {spots.map((spot) => {
                const normalizedStatus = getStatus(spot.status);

                const status = statusStyles[normalizedStatus] || {
                  backgroundColor: "#edf1f1",
                  color: "#536365",
                  icon: "bi-question-circle",
                };

                const category =
                  spot.category &&
                  typeof spot.category === "object"
                    ? spot.category.name
                    : spot.category_name;

                return (
                  <article
                    key={spot.id}
                    className="p-3 p-md-4"
                    style={{
                      border: "1px solid #e8efec",
                      borderRadius: "14px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3">
                      <div
                        className="flex-grow-1 w-100"
                        style={{ minWidth: 0 }}
                      >
                        <div className="d-flex align-items-start gap-3 mb-3">
                          <div
                            className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-3"
                            style={{
                              width: "42px",
                              height: "42px",
                              backgroundColor: "#f0f8f5",
                              color: "#087f68",
                            }}
                          >
                            <i
                              className="bi bi-geo-alt"
                              aria-hidden="true"
                              style={{ fontSize: "19px" }}
                            />
                          </div>

                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <h6
                              className="fw-bold mb-2 text-break"
                              style={{
                                color: "#26373a",
                                fontSize: "15px",
                              }}
                            >
                              {spot.name || "Untitled spot"}
                            </h6>

                            <div
                              className="d-flex flex-wrap align-items-center gap-3"
                              style={{
                                color: "#819092",
                                fontSize: "12px",
                              }}
                            >
                              <span className="d-flex align-items-center gap-2">
                                <i
                                  className="bi bi-tag"
                                  aria-hidden="true"
                                />
                                {category || "Uncategorized"}
                              </span>

                              <span className="d-flex align-items-center gap-2">
                                <i
                                  className="bi bi-calendar3"
                                  aria-hidden="true"
                                />
                                {formatDate(spot.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {spot.description && (
                          <p
                            className="mb-0"
                            style={{
                              color: "#5e6e71",
                              fontSize: "13px",
                              lineHeight: 1.8,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {spot.description}
                          </p>
                        )}

                        {spot.rejection_reason && (
                          <div
                            className="alert alert-danger py-3 px-3 mt-3 mb-0"
                            style={{
                              borderRadius: "10px",
                              fontSize: "12px",
                              lineHeight: 1.7,
                            }}
                          >
                            <div className="d-flex align-items-start gap-2">
                              <i
                                className="bi bi-exclamation-triangle mt-1"
                                aria-hidden="true"
                              />

                              <div>
                                <strong>Reason for rejection:</strong>{" "}
                                {spot.rejection_reason}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <span
                        className="badge rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 flex-shrink-0"
                        style={{
                          backgroundColor: status.backgroundColor,
                          color: status.color,
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.3px",
                        }}
                      >
                        <i
                          className={`bi ${status.icon}`}
                          aria-hidden="true"
                        />
                        {normalizedStatus}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}