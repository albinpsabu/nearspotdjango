
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const C = {
  heading: "#1d2b2e",
  muted: "#819092",
  green: "#087f68",
  light: "#e6faf4",
  border: "#e8efec",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  border: `1px solid ${C.border}`,
  borderRadius: "14px",
  boxShadow: "0 3px 12px rgba(20, 50, 45, 0.035)",
};

const getStatusStyle = (status) => {
  const styles = {
    APPROVED: { background: "#e6faf4", color: "#087f68" },
    PENDING: { background: "#fff5df", color: "#a56b00" },
    REJECTED: { background: "#fdecec", color: "#c0392b" },
    CANCELLED: { background: "#eef1f2", color: "#647477" },
  };

  return styles[status] || {
    background: "#eef1f2",
    color: "#647477",
  };
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

export default function UserDashboard() {
  const { user } = useAuth();

  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchSpots = async () => {
      setLoading(true);
      setError("");

      try {
        let url = "/spots/my/";
        let allSpots = [];

        while (url) {
          const response = await api.get(url, {
            signal: controller.signal,
          });

          const data = response.data;

          if (Array.isArray(data)) {
            allSpots = [...allSpots, ...data];
            url = null;
          } else if (data && Array.isArray(data.results)) {
            allSpots = [...allSpots, ...data.results];
            url = data.next || null;
          } else {
            url = null;
          }
        }

        if (!controller.signal.aborted) {
          setSpots(allSpots);
        }
      } catch (err) {
        if (
          !controller.signal.aborted &&
          err.name !== "CanceledError" &&
          err.code !== "ERR_CANCELED"
        ) {
          console.error("Failed to fetch dashboard spots:", err);
          setError("Unable to load your submissions.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSpots();

    return () => controller.abort();
  }, []);

  const approved = spots.filter(
    (spot) => spot.status === "APPROVED"
  ).length;

  const pending = spots.filter(
    (spot) => spot.status === "PENDING"
  ).length;

  const rejected = spots.filter(
    (spot) => spot.status === "REJECTED"
  ).length;

  const recentSpots = [...spots]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 4);

  const statCards = [
    {
      label: "Total Submissions",
      value: spots.length,
      icon: "bi-geo-alt",
      background: "#e6faf4",
      foreground: "#087f68",
    },
    {
      label: "Approved",
      value: approved,
      icon: "bi-check-circle",
      background: "#e6faf4",
      foreground: "#087f68",
    },
    {
      label: "Pending",
      value: pending,
      icon: "bi-hourglass-split",
      background: "#fff5df",
      foreground: "#a56b00",
    },
    {
      label: "Rejected",
      value: rejected,
      icon: "bi-x-circle",
      background: "#fdecec",
      foreground: "#c0392b",
    },
  ];

  return (
    <div
      className="d-flex flex-column w-100 h-100"
      style={{
        minHeight: 0,
        overflow: "hidden",
        color: C.heading,
      }}
    >
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center gap-3 flex-shrink-0 pb-3">
        <div style={{ minWidth: 0 }}>
          <h3
            className="fw-bold mb-1 text-truncate"
            style={{
              fontSize: "clamp(20px, 2vw, 28px)",
              letterSpacing: "-0.7px",
            }}
          >
            Welcome back, {user?.name?.split(" ")[0] || "there"}!
          </h3>

          <p
            className="mb-0 text-truncate"
            style={{ color: C.muted, fontSize: "12px" }}
          >
            Here's an overview of your NearSpot activity.
          </p>
        </div>

        <Link
          to="/"
          className="btn text-white fw-semibold d-inline-flex align-items-center gap-2 flex-shrink-0 px-3 py-2"
          style={{
            backgroundColor: C.green,
            borderRadius: "9px",
            fontSize: "11px",
          }}
        >
          <i className="bi bi-compass" aria-hidden="true" />
          <span className="d-none d-sm-inline">Explore Spots</span>
          <span className="d-sm-none">Explore</span>
        </Link>
      </div>

      {/* Statistics */}
      <div className="row g-2 flex-shrink-0 mb-3">
        {statCards.map((stat) => (
          <div className="col-6 col-xl-3" key={stat.label}>
            <div className="card h-100" style={cardStyle}>
              <div className="card-body p-2 p-md-3">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="mb-1 text-truncate"
                      style={{
                        color: C.muted,
                        fontSize: "clamp(10px, 1vw, 12px)",
                      }}
                    >
                      {stat.label}
                    </p>

                    <h3
                      className="fw-bold mb-0"
                      style={{ fontSize: "clamp(21px, 2vw, 28px)" }}
                    >
                      {loading ? "—" : stat.value}
                    </h3>
                  </div>

                  <div
                    className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{
                      width: "clamp(32px, 3.5vw, 42px)",
                      height: "clamp(32px, 3.5vw, 42px)",
                      backgroundColor: stat.background,
                      color: stat.foreground,
                    }}
                  >
                    <i
                      className={`bi ${stat.icon}`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent submissions fills remaining screen */}
      <section
        className="card flex-grow-1"
        style={{
          ...cardStyle,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div className="card-body p-3 p-md-4 d-flex flex-column">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3 flex-shrink-0">
            <div>
              <h5
                className="fw-bold mb-1"
                style={{ fontSize: "15px" }}
              >
                Recent Submissions
              </h5>

              <p
                className="mb-0"
                style={{ color: C.muted, fontSize: "11px" }}
              >
                Your latest submitted places
              </p>
            </div>

            <Link
              to="/user/submissions"
              className="text-decoration-none fw-semibold flex-shrink-0"
              style={{ color: C.green, fontSize: "11px" }}
            >
              View all
              <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
            </Link>
          </div>

          {error ? (
            <div
              className="alert alert-danger mb-0"
              role="alert"
              style={{ fontSize: "12px" }}
            >
              {error}
            </div>
          ) : loading ? (
            <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center">
              <div
                className="spinner-border spinner-border-sm"
                style={{ color: C.green }}
                role="status"
                aria-label="Loading submissions"
              />

              <p
                className="mt-2 mb-0"
                style={{ color: C.muted, fontSize: "12px" }}
              >
                Loading submissions...
              </p>
            </div>
          ) : recentSpots.length === 0 ? (
            <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center">
              <i
                className="bi bi-geo"
                style={{ fontSize: "34px", color: C.green }}
                aria-hidden="true"
              />

              <p className="fw-semibold mt-3 mb-1" style={{ fontSize: "13px" }}>
                No submissions yet
              </p>

              <p
                className="mb-3"
                style={{ color: C.muted, fontSize: "12px" }}
              >
                Share a hidden gem with the community.
              </p>

              <Link
                to="/"
                className="btn btn-sm text-white"
                style={{ backgroundColor: C.green, fontSize: "12px" }}
              >
                Explore Spots
              </Link>
            </div>
          ) : (
            <div className="flex-grow-1">
              {recentSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="d-flex justify-content-between align-items-center gap-3 py-3 border-bottom"
                >
                  <div
                    className="d-flex align-items-center gap-3"
                    style={{ minWidth: 0 }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: C.light,
                        color: C.green,
                      }}
                    >
                      <i className="bi bi-geo-alt" aria-hidden="true" />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        className="fw-semibold mb-1 text-truncate"
                        style={{ fontSize: "13px" }}
                      >
                        {spot.name || "Unnamed spot"}
                      </p>

                      <p
                        className="mb-0"
                        style={{ color: C.muted, fontSize: "11px" }}
                      >
                        {formatDate(spot.created_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className="badge rounded-pill flex-shrink-0"
                    style={{
                      ...getStatusStyle(spot.status),
                      fontSize: "10px",
                      padding: "7px 9px",
                    }}
                  >
                    {spot.status || "Unknown"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
