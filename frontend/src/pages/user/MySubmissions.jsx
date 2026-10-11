
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid #edf1ef",
  boxShadow: "0 4px 18px rgba(20, 50, 45, 0.04)",
  backgroundColor: "#ffffff",
};

const statusStyles = {
  PENDING: {
    backgroundColor: "#fff5df",
    color: "#a8760b",
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

  const fetchSubmissions = useCallback(async () => {
    if (!isAuthenticated) return;

    // Cancel any previous request before refreshing.
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const allSpots = [];
      const visitedUrls = new Set();
      let nextUrl = "/spots/my/";

      // Fetch all pages returned by Django REST Framework.
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

      // Display the newest submissions first.
      const sortedSpots = allSpots.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      if (!controller.signal.aborted) {
        setSpots(sortedSpots);
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      console.error("Fetch submissions error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load your submissions. Please try again."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSubmissions();
    }

    return () => {
      requestRef.current?.abort();
    };
  }, [authLoading, isAuthenticated, fetchSubmissions]);

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

  if (authLoading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border"
          style={{ color: "#20cfa7" }}
          role="status"
          aria-label="Loading account"
        />
        <p className="mt-3 mb-0 text-muted">
          Loading your account...
        </p>
      </div>
    );
  }

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
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{
                width: "70px",
                height: "70px",
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

            <h5 className="fw-bold mb-2">
              Login required
            </h5>

            <p
              className="mb-0"
              style={{
                color: "#819092",
                fontSize: "13px",
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
    <div
      className="w-100"
      style={{ color: "#1d2b2e" }}
    >
      {/* Page Heading */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3
            className="fw-bold mb-2"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.6px",
            }}
          >
            My Submissions
          </h3>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
            }}
          >
            Keep track of the hidden spots you have shared with NearSpot.
          </p>
        </div>

        <button
          type="button"
          className="btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold"
          onClick={fetchSubmissions}
          disabled={loading}
          style={{
            color: "#087f68",
            backgroundColor: "#e6faf4",
            border: "1px solid #c9f2e6",
            borderRadius: "10px",
            fontSize: "13px",
            minHeight: "42px",
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

      {/* Statistics */}
      <div className="row g-3 g-xl-4 mb-4">
        {statistics.map((item) => (
          <div
            className="col-12 col-sm-6 col-xl-3"
            key={item.label}
          >
            <div className="card h-100" style={cardStyle}>
              <div className="card-body p-4">
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="mb-3 fw-medium"
                      style={{
                        color: "#77878a",
                        fontSize: "13px",
                      }}
                    >
                      {item.label}
                    </p>

                    <h2
                      className="fw-bold mb-2"
                      style={{
                        fontSize: "32px",
                        letterSpacing: "-0.7px",
                      }}
                    >
                      {loading && spots.length === 0
                        ? "..."
                        : error && spots.length === 0
                          ? "—"
                          : item.value}
                    </h2>

                    <div
                      style={{
                        color: "#97a4a6",
                        fontSize: "11px",
                      }}
                    >
                      {item.description}
                    </div>
                  </div>

                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "13px",
                      backgroundColor: item.background,
                      color: item.color,
                    }}
                  >
                    <i
                      className={`bi ${item.icon}`}
                      aria-hidden="true"
                      style={{ fontSize: "21px" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchSubmissions}
            disabled={loading}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Submissions Card */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <h5
                className="fw-bold mb-2"
                style={{ fontSize: "17px" }}
              >
                Submitted Spots
              </h5>

              <p
                className="mb-0"
                style={{
                  color: "#819092",
                  fontSize: "12px",
                }}
              >
                View the status and details of your submissions.
              </p>
            </div>

            <span
              className="badge rounded-pill px-3 py-2"
              style={{
                backgroundColor: "#e6faf4",
                color: "#087f68",
                fontSize: "12px",
              }}
            >
              {spots.length} total
            </span>
          </div>

          {loading && spots.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{ color: "#20cfa7" }}
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
            <div className="text-center py-5">
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
                  style={{ fontSize: "32px" }}
                />
              </div>

              <h6 className="fw-bold mb-2">
                No submissions yet
              </h6>

              <p
                className="mb-0"
                style={{
                  color: "#819092",
                  fontSize: "13px",
                }}
              >
                Discover a hidden spot and submit it through the
                NearSpot map. Your submissions will appear here.
              </p>
            </div>
          ) : spots.length > 0 ? (
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
                      border: "1px solid #e8eeee",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3">
                      <div
                        className="flex-grow-1"
                        style={{ minWidth: 0 }}
                      >
                        <h6
                          className="fw-bold mb-3"
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

                        {spot.description && (
                          <p
                            className="mt-3 mb-0"
                            style={{
                              color: "#5e6e71",
                              fontSize: "13px",
                              lineHeight: 1.7,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {spot.description}
                          </p>
                        )}

                        {spot.rejection_reason && (
                          <div
                            className="alert alert-danger py-2 px-3 mt-3 mb-0"
                            style={{
                              borderRadius: "10px",
                              fontSize: "12px",
                            }}
                          >
                            <strong>Reason for rejection: </strong>
                            {spot.rejection_reason}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className="badge rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 flex-shrink-0"
                        style={{
                          backgroundColor: status.backgroundColor,
                          color: status.color,
                          fontSize: "11px",
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
