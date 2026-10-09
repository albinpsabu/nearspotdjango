
 // ============================================================
// IMPORTS
// ============================================================

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// API CONFIGURATION
// ============================================================

const DASHBOARD_API =
  "http://127.0.0.1:8000/api/accounts/admin-dashboard/";

const AUDIT_LOGS_API =
  "http://127.0.0.1:8000/api/spots/admin/audit-logs/";

// ============================================================
// REUSABLE STATISTIC CARD
// ============================================================

function StatCard({
  title,
  value,
  description,
  accent = "#1d2b2e",
}) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <div
            className="mb-3"
            style={{
              color: "#7c8b8e",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {title}
          </div>

          <div
            className="fw-bold"
            style={{
              color: accent,
              fontSize: "28px",
            }}
          >
            {value}
          </div>

          <div
            className="mt-2"
            style={{
              color: "#9aa6a8",
              fontSize: "11px",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REUSABLE SECTION CARD
// ============================================================

function SectionCard({ title, children }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <h5
          className="fw-semibold mb-3"
          style={{
            color: "#1d2b2e",
            fontSize: "16px",
          }}
        >
          {title}
        </h5>

        {children}
      </div>
    </div>
  );
}

// ============================================================
// REUSABLE STATISTIC ROW
// ============================================================

function StatisticRow({
  label,
  value,
  color = "#1d2b2e",
}) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span
        style={{
          color: "#667779",
          fontSize: "13px",
        }}
      >
        {label}
      </span>

      <span
        className="fw-semibold"
        style={{
          color,
          fontSize: "14px",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================

function AdminDashboard() {
  // ============================================================
  // STATE
  // ============================================================

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(true);
  const [auditLogsError, setAuditLogsError] = useState("");

  // ============================================================
  // GET ACCESS TOKEN
  // ============================================================

  const getAccessToken = () => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken")
    );
  };

  // ============================================================
  // FETCH DASHBOARD STATISTICS
  // ============================================================

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error(
          "Access token not found. Please log in again or verify the token key in AuthContext."
        );
      }

      const response = await fetch(DASHBOARD_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please log in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Access denied. Please log in using an admin account."
          );
        }

        throw new Error(
          `Unable to load dashboard statistics. HTTP ${response.status}.`
        );
      }

      const data = await response.json();

      setStats(data);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while loading dashboard statistics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // FETCH RECENT AUDIT LOGS
  // ============================================================

  const fetchAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    setAuditLogsError("");

    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Access token not found. Please log in again.");
      }

      const response = await fetch(AUDIT_LOGS_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please log in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to view audit logs."
          );
        }

        throw new Error(
          `Unable to load activity logs. HTTP ${response.status}.`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Unexpected audit logs response format."
        );
      }

      // The API returns newest activity first.
      setAuditLogs(data.slice(0, 6));
    } catch (err) {
      setAuditLogsError(
        err.message || "Unable to load recent activity."
      );
    } finally {
      setAuditLogsLoading(false);
    }
  }, []);

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    fetchDashboardStats();
    fetchAuditLogs();
  }, [fetchDashboardStats, fetchAuditLogs]);

  // ============================================================
  // FORMAT STATISTIC VALUES
  // ============================================================

  const formatValue = (number) => {
    if (loading) {
      return "...";
    }

    return (number ?? 0).toLocaleString();
  };

  // ============================================================
  // FORMAT AUDIT LOG ACTION
  // ============================================================

  const formatAction = (action) => {
    return (action || "ACTIVITY").replaceAll("_", " ");
  };

  // ============================================================
  // FORMAT AUDIT LOG TIMESTAMP
  // ============================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Time unavailable";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Time unavailable";
    }

    return date.toLocaleString();
  };

  // ============================================================
  // GET AUDIT LOG ICON LETTER
  // ============================================================

  const getActivityLetter = (action) => {
    if (action?.startsWith("REPORT")) {
      return "R";
    }

    if (action?.startsWith("SPOT")) {
      return "S";
    }

    return "A";
  };

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <AdminLayout>
      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{
              color: "#1d2b2e",
              fontSize: "24px",
            }}
          >
            Dashboard
          </h1>

          <p
            className="mb-0"
            style={{
              color: "#7c8b8e",
              fontSize: "13px",
            }}
          >
            Overview of your NearSpot platform.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm rounded-3 px-3"
          onClick={() => {
            fetchDashboardStats();
            fetchAuditLogs();
          }}
          disabled={loading || auditLogsLoading}
        >
          {loading || auditLogsLoading
            ? "Loading..."
            : "Refresh dashboard"}
        </button>
      </div>

      {/* ======================================================
          DASHBOARD ERROR
      ======================================================= */}

      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchDashboardStats}
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          OVERVIEW STATISTICS
      ======================================================= */}

      <div className="row g-3">
        <StatCard
          title="TOTAL USERS"
          value={formatValue(stats?.users)}
          description="Registered users"
        />

        <StatCard
          title="EMPLOYEES"
          value={formatValue(stats?.employees)}
          description="Registered employees"
        />

        <StatCard
          title="TOTAL SPOTS"
          value={formatValue(stats?.spots?.total)}
          description="Hidden spots on the platform"
        />

        <StatCard
          title="PENDING REVIEW"
          value={formatValue(stats?.spots?.pending)}
          description="Spots awaiting review"
          accent="#d97706"
        />
      </div>

      {/* ======================================================
          SPOT AND REPORT STATISTICS
      ======================================================= */}

      <div className="row g-3 mt-1">
        {/* ----------------------------------------------------
            SPOT MANAGEMENT
        ----------------------------------------------------- */}

        <div className="col-12 col-xl-6">
          <SectionCard title="Spot Management">
            <StatisticRow
              label="Total spots"
              value={formatValue(stats?.spots?.total)}
            />

            <StatisticRow
              label="Pending review"
              value={formatValue(stats?.spots?.pending)}
              color="#d97706"
            />

            <StatisticRow
              label="Approved spots"
              value={formatValue(stats?.spots?.approved)}
              color="#198754"
            />

            <StatisticRow
              label="Rejected spots"
              value={formatValue(stats?.spots?.rejected)}
              color="#dc3545"
            />

            <StatisticRow
              label="Cancelled spots"
              value={formatValue(stats?.spots?.cancelled)}
            />
          </SectionCard>
        </div>

        {/* ----------------------------------------------------
            REPORT MANAGEMENT
        ----------------------------------------------------- */}

        <div className="col-12 col-xl-6">
          <SectionCard title="Report Management">
            <StatisticRow
              label="Total reports"
              value={formatValue(stats?.reports?.total)}
            />

            <StatisticRow
              label="Pending reports"
              value={formatValue(stats?.reports?.pending)}
              color="#d97706"
            />

            <StatisticRow
              label="Reviewed reports"
              value={formatValue(stats?.reports?.reviewed)}
              color="#0d6efd"
            />

            <StatisticRow
              label="Resolved reports"
              value={formatValue(stats?.reports?.resolved)}
              color="#198754"
            />
          </SectionCard>
        </div>
      </div>

      {/* ======================================================
          PLATFORM SUMMARY AND PENDING ACTIONS
      ======================================================= */}

      <div className="row g-3 mt-1">
        {/* ----------------------------------------------------
            PLATFORM SUMMARY
        ----------------------------------------------------- */}

        <div className="col-12 col-xl-4">
          <SectionCard title="Platform Summary">
            <StatisticRow
              label="Registered users"
              value={formatValue(stats?.users)}
            />

            <StatisticRow
              label="Employees"
              value={formatValue(stats?.employees)}
            />

            <StatisticRow
              label="Administrators"
              value={formatValue(stats?.admins)}
            />

            <StatisticRow
              label="Categories"
              value={formatValue(stats?.categories)}
            />
          </SectionCard>
        </div>

        {/* ----------------------------------------------------
            PENDING ACTIONS
        ----------------------------------------------------- */}

        <div className="col-12 col-xl-8">
          <SectionCard title="Pending Actions">
            <p
              className="mb-3"
              style={{
                color: "#7c8b8e",
                fontSize: "13px",
              }}
            >
              Items that may require your attention.
            </p>

            <div
              className="d-flex justify-content-between align-items-center gap-3 p-3 rounded-3 mb-3"
              style={{ background: "#fff8e8" }}
            >
              <div>
                <div
                  className="fw-semibold"
                  style={{
                    color: "#805b16",
                    fontSize: "13px",
                  }}
                >
                  Spots awaiting review
                </div>

                <div
                  style={{
                    color: "#8a989a",
                    fontSize: "11px",
                  }}
                >
                  Review submitted hidden spots.
                </div>
              </div>

              <span
                className="fw-bold"
                style={{
                  color: "#d97706",
                  fontSize: "20px",
                }}
              >
                {formatValue(stats?.spots?.pending)}
              </span>
            </div>

            <div
              className="d-flex justify-content-between align-items-center gap-3 p-3 rounded-3"
              style={{ background: "#fff0f0" }}
            >
              <div>
                <div
                  className="fw-semibold"
                  style={{
                    color: "#a12b35",
                    fontSize: "13px",
                  }}
                >
                  Pending reports
                </div>

                <div
                  style={{
                    color: "#8a989a",
                    fontSize: "11px",
                  }}
                >
                  Check reports submitted by users.
                </div>
              </div>

              <span
                className="fw-bold"
                style={{
                  color: "#dc3545",
                  fontSize: "20px",
                }}
              >
                {formatValue(stats?.reports?.pending)}
              </span>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ======================================================
          RECENT ACTIVITY
      ======================================================= */}

      <div className="row g-3 mt-1">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              {/* ------------------------------------------------
                  ACTIVITY HEADER
              ------------------------------------------------- */}

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5
                    className="fw-semibold mb-1"
                    style={{
                      color: "#1d2b2e",
                      fontSize: "16px",
                    }}
                  >
                    Recent Activity
                  </h5>

                  <p
                    className="mb-0"
                    style={{
                      color: "#8a989a",
                      fontSize: "12px",
                    }}
                  >
                    Latest actions performed on the platform.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-3"
                  onClick={fetchAuditLogs}
                  disabled={auditLogsLoading}
                >
                  {auditLogsLoading ? "Loading..." : "Refresh activity"}
                </button>
              </div>

              {/* ------------------------------------------------
                  ACTIVITY ERROR
              ------------------------------------------------- */}

              {auditLogsError && (
                <div
                  className="alert alert-danger py-2 rounded-3"
                  role="alert"
                >
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <span>{auditLogsError}</span>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={fetchAuditLogs}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------
                  ACTIVITY LOADING
              ------------------------------------------------- */}

              {auditLogsLoading && (
                <div
                  className="text-center py-4"
                  style={{
                    color: "#8a989a",
                    fontSize: "13px",
                  }}
                >
                  Loading recent activity...
                </div>
              )}

              {/* ------------------------------------------------
                  EMPTY ACTIVITY STATE
              ------------------------------------------------- */}

              {!auditLogsLoading &&
                !auditLogsError &&
                auditLogs.length === 0 && (
                  <div
                    className="text-center py-4"
                    style={{
                      color: "#8a989a",
                      fontSize: "13px",
                    }}
                  >
                    No activity records found.
                  </div>
                )}

              {/* ------------------------------------------------
                  ACTIVITY LIST
              ------------------------------------------------- */}

              {!auditLogsLoading &&
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="d-flex gap-3 py-3 border-bottom"
                  >
                    {/* ACTIVITY ICON */}

                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "38px",
                        height: "38px",
                        background: log.action?.startsWith("REPORT")
                          ? "#eaf1ff"
                          : "#eaf5ef",
                        color: log.action?.startsWith("REPORT")
                          ? "#0d6efd"
                          : "#198754",
                        fontSize: "15px",
                        fontWeight: 700,
                      }}
                    >
                      {getActivityLetter(log.action)}
                    </div>

                    {/* ACTIVITY DETAILS */}

                    <div
                      className="flex-grow-1"
                      style={{ minWidth: 0 }}
                    >
                      <div
                        className="fw-semibold mb-1"
                        style={{
                          color: "#1d2b2e",
                          fontSize: "13px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {formatAction(log.action)}
                      </div>

                      <div
                        className="mb-1"
                        style={{
                          color: "#667779",
                          fontSize: "12px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {log.description}
                      </div>

                      <div
                        style={{
                          color: "#9aa6a8",
                          fontSize: "11px",
                        }}
                      >
                        By {log.user_name || "Unknown user"}{" "}
                        &middot; {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminDashboard;
