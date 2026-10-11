
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../services/api";

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

export default function AdminDashboard() {
  // Dashboard statistics
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Recent audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(true);
  const [auditLogsError, setAuditLogsError] = useState("");

  // ============================================================
  // FETCH DASHBOARD STATISTICS
  // ============================================================

  const fetchDashboardStats = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      // Axios automatically attaches the JWT access token.
      const response = await api.get(
        "/accounts/admin-dashboard/",
        { signal }
      );

      if (!signal?.aborted) {
        setStats(response.data);
      }
    } catch (err) {
      if (
        signal?.aborted ||
        err.code === "ERR_CANCELED"
      ) {
        return;
      }

      console.error("Dashboard statistics error:", err);

      if (err.response?.status === 401) {
        setError(
          "Authentication failed. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setError(
          "Access denied. Please log in using an admin account."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Something went wrong while loading dashboard statistics."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // ============================================================
  // FETCH RECENT AUDIT LOGS
  // ============================================================

  const fetchAuditLogs = useCallback(async (signal) => {
    setAuditLogsLoading(true);
    setAuditLogsError("");

    try {
      // Use the same authenticated Axios instance.
      const response = await api.get(
        "/spots/admin/audit-logs/",
        { signal }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error(
          "Unexpected audit logs response format."
        );
      }

      if (!signal?.aborted) {
        // Show the six most recent records.
        setAuditLogs(data.slice(0, 6));
      }
    } catch (err) {
      if (
        signal?.aborted ||
        err.code === "ERR_CANCELED"
      ) {
        return;
      }

      console.error("Audit logs error:", err);

      if (err.response?.status === 401) {
        setAuditLogsError(
          "Authentication failed. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setAuditLogsError(
          "You do not have permission to view audit logs."
        );
      } else {
        setAuditLogsError(
          err.response?.data?.detail ||
            err.message ||
            "Unable to load recent activity."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setAuditLogsLoading(false);
      }
    }
  }, []);

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboardStats(controller.signal);
    fetchAuditLogs(controller.signal);

    return () => controller.abort();
  }, [fetchDashboardStats, fetchAuditLogs]);

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatValue = (number) => {
    if (loading) {
      return "...";
    }

    return Number(number ?? 0).toLocaleString();
  };

  const formatAction = (action) => {
    return String(action || "ACTIVITY").replaceAll(
      "_",
      " "
    );
  };

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
      {/* Page Header */}
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

      {/* Dashboard Error */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => fetchDashboardStats()}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      {/* Overview Statistics */}
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

      {/* Spot and Report Statistics */}
      <div className="row g-3 mt-1">
        {/* Spot Management */}
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

        {/* Report Management */}
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

      {/* Platform Summary and Pending Actions */}
      <div className="row g-3 mt-1">
        {/* Platform Summary */}
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

        {/* Pending Actions */}
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

            {/* Pending Spots */}
            <div
              className="d-flex justify-content-between align-items-center gap-3 p-3 rounded-3 mb-3"
              style={{
                backgroundColor: "#fff8e8",
              }}
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

            {/* Pending Reports */}
            <div
              className="d-flex justify-content-between align-items-center gap-3 p-3 rounded-3"
              style={{
                backgroundColor: "#fff0f0",
              }}
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

      {/* Recent Activity */}
      <div className="row g-3 mt-1">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              {/* Activity Header */}
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
                  onClick={() => fetchAuditLogs()}
                  disabled={auditLogsLoading}
                >
                  {auditLogsLoading
                    ? "Loading..."
                    : "Refresh activity"}
                </button>
              </div>

              {/* Activity Error */}
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
                      onClick={() => fetchAuditLogs()}
                      disabled={auditLogsLoading}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Loading */}
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

              {/* Empty Activity State */}
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

              {/* Activity List */}
              {!auditLogsLoading &&
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="d-flex gap-3 py-3 border-bottom"
                  >
                    {/* Activity Icon */}
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "38px",
                        height: "38px",
                        background:
                          log.action?.startsWith("REPORT")
                            ? "#eaf1ff"
                            : "#eaf5ef",
                        color:
                          log.action?.startsWith("REPORT")
                            ? "#0d6efd"
                            : "#198754",
                        fontSize: "15px",
                        fontWeight: 700,
                      }}
                    >
                      {getActivityLetter(log.action)}
                    </div>

                    {/* Activity Details */}
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
