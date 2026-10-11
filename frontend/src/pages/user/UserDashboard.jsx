
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid #edf1ef",
  boxShadow: "0 4px 18px rgba(20, 50, 45, 0.04)",
  backgroundColor: "#ffffff",
};

function UserDashboard() {
  const navigate = useNavigate();

  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError("");

        const allSpots = [];
        const visitedUrls = new Set();
        let nextUrl = "/spots/my/";

        // Support both paginated and non-paginated DRF responses.
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

        if (!controller.signal.aborted) {
          setSpots(allSpots);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Failed to load submissions:", err);

        setError(
          err.response?.data?.detail ||
            "Unable to load your submissions. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSubmissions();

    return () => controller.abort();
  }, []);

  const totalSpots = spots.length;

  const approvedSpots = spots.filter(
    (spot) => spot.status?.toUpperCase() === "APPROVED"
  ).length;

  const pendingSpots = spots.filter(
    (spot) => spot.status?.toUpperCase() === "PENDING"
  ).length;

  const rejectedSpots = spots.filter(
    (spot) => spot.status?.toUpperCase() === "REJECTED"
  ).length;

  const recentSpots = [...spots]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 5);

  const statistics = [
    {
      title: "Total Submissions",
      value: totalSpots,
      icon: "bi-geo-alt",
      color: "#087f68",
      background: "#e6faf4",
      description: "All submitted spots",
    },
    {
      title: "Approved Spots",
      value: approvedSpots,
      icon: "bi-check-circle",
      color: "#168a70",
      background: "#e6faf4",
      description: "Successfully approved",
    },
    {
      title: "Pending Review",
      value: pendingSpots,
      icon: "bi-clock-history",
      color: "#b78012",
      background: "#fff5df",
      description: "Awaiting verification",
    },
    {
      title: "Rejected Spots",
      value: rejectedSpots,
      icon: "bi-x-circle",
      color: "#c64d55",
      background: "#fdeced",
      description: "Not approved",
    },
  ];

  const quickLinks = [
    {
      title: "My Profile",
      description: "View and update your account information.",
      icon: "bi-person",
      path: "/user/profile",
    },
    {
      title: "My Reviews",
      description: "Manage your reviews and ratings.",
      icon: "bi-star",
      path: "/user/reviews",
    },
    {
      title: "Saved Spots",
      description: "Revisit your bookmarked places.",
      icon: "bi-bookmark",
      path: "/user/saved",
    },
  ];

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return {
          backgroundColor: "#e6faf4",
          color: "#087f68",
        };
      case "PENDING":
        return {
          backgroundColor: "#fff4d6",
          color: "#946c00",
        };
      case "REJECTED":
        return {
          backgroundColor: "#fdecec",
          color: "#c0392b",
        };
      default:
        return {
          backgroundColor: "#edf1f1",
          color: "#536365",
        };
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString();
  };

  return (
    <div
      className="w-100"
      style={{
        color: "#1d2b2e",
      }}
    >
      {/* Dashboard Heading */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3
            className="fw-bold mb-2"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.6px",
            }}
          >
            Welcome to NearSpot
          </h3>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
            }}
          >
            Here's an overview of your spot submissions and activity.
          </p>
        </div>

        <button
          type="button"
          className="btn d-flex align-items-center gap-2 text-white fw-semibold px-4 py-2"
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#20cfa7",
            borderRadius: "10px",
            fontSize: "13px",
            minHeight: "42px",
          }}
        >
          <i
            className="bi bi-compass"
            aria-hidden="true"
            style={{ fontSize: "16px" }}
          />
          Explore Map
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row g-3 g-xl-4 mb-4">
        {statistics.map((item) => (
          <div
            className="col-12 col-sm-6 col-xl-3"
            key={item.title}
          >
            <div
              className="card h-100"
              style={cardStyle}
            >
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
                      {item.title}
                    </p>

                    <h2
                      className="fw-bold mb-2"
                      style={{
                        fontSize: "32px",
                        letterSpacing: "-0.7px",
                      }}
                    >
                      {loading ? "..." : error ? "—" : item.value}
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
                      style={{
                        fontSize: "21px",
                        lineHeight: 1,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div
        className="card mb-4"
        style={cardStyle}
      >
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <h5
                className="fw-bold mb-2"
                style={{ fontSize: "17px" }}
              >
                Recent Submissions
              </h5>

              <p
                className="mb-0"
                style={{
                  color: "#819092",
                  fontSize: "12px",
                }}
              >
                Track the latest spots you've submitted.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary rounded-3 px-3"
              onClick={() => navigate("/user/submissions")}
              style={{ fontSize: "12px" }}
            >
              View All
              <i
                className="bi bi-arrow-right ms-2"
                aria-hidden="true"
              />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{
                  color: "#20cfa7",
                  width: "32px",
                  height: "32px",
                }}
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>

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
          ) : error ? (
            <div
              className="alert alert-warning mb-0"
              role="alert"
            >
              {error}
            </div>
          ) : spots.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{
                  width: "76px",
                  height: "76px",
                  backgroundColor: "#e6faf4",
                  color: "#20cfa7",
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
                style={{
                  color: "#819092",
                  fontSize: "13px",
                }}
              >
                Discover a place and submit your first hidden spot.
              </p>

              <button
                type="button"
                className="btn text-white fw-semibold px-4 py-2"
                onClick={() => navigate("/")}
                style={{
                  backgroundColor: "#20cfa7",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
              >
                Explore NearSpot
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr
                    style={{
                      color: "#819092",
                      fontSize: "12px",
                    }}
                  >
                    <th className="py-3 fw-semibold">
                      Spot Name
                    </th>
                    <th className="py-3 fw-semibold">
                      Category
                    </th>
                    <th className="py-3 fw-semibold">
                      Status
                    </th>
                    <th className="py-3 fw-semibold">
                      Submitted
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentSpots.map((spot) => (
                    <tr key={spot.id}>
                      <td
                        className="py-3 fw-semibold"
                        style={{
                          color: "#26373a",
                          fontSize: "13px",
                        }}
                      >
                        {spot.name || "Untitled spot"}
                      </td>

                      <td
                        className="py-3"
                        style={{
                          color: "#687779",
                          fontSize: "13px",
                        }}
                      >
                        {spot.category &&
                        typeof spot.category === "object"
                          ? spot.category.name || "Uncategorized"
                          : spot.category_name || "Uncategorized"}
                      </td>

                      <td className="py-3">
                        <span
                          className="badge rounded-pill px-3 py-2"
                          style={{
                            ...getStatusStyle(spot.status),
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {spot.status || "Unknown"}
                        </span>
                      </td>

                      <td
                        className="py-3"
                        style={{
                          color: "#819092",
                          fontSize: "12px",
                        }}
                      >
                        {formatDate(spot.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div className="mb-3">
        <h5
          className="fw-bold mb-3"
          style={{ fontSize: "17px" }}
        >
          Quick Access
        </h5>

        <div className="row g-3 g-xl-4">
          {quickLinks.map((item) => (
            <div
              className="col-12 col-md-4"
              key={item.title}
            >
              <button
                type="button"
                className="card w-100 h-100 text-start"
                onClick={() => navigate(item.path)}
                style={{
                  ...cardStyle,
                  cursor: "pointer",
                }}
              >
                <div className="card-body p-4 d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "13px",
                      backgroundColor: "#e6faf4",
                      color: "#087f68",
                    }}
                  >
                    <i
                      className={`bi ${item.icon}`}
                      aria-hidden="true"
                      style={{
                        fontSize: "21px",
                      }}
                    />
                  </div>

                  <div className="flex-grow-1">
                    <h6
                      className="fw-bold mb-1"
                      style={{
                        fontSize: "14px",
                        color: "#26373a",
                      }}
                    >
                      {item.title}
                    </h6>

                    <p
                      className="mb-0"
                      style={{
                        fontSize: "12px",
                        color: "#819092",
                      }}
                    >
                      {item.description}
                    </p>
                  </div>

                  <i
                    className="bi bi-chevron-right flex-shrink-0"
                    aria-hidden="true"
                    style={{
                      color: "#9ca9ab",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
