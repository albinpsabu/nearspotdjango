
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// API CONFIGURATION
// ============================================================

const REPORTS_API = "http://127.0.0.1:8000/api/spots/reports/";

const REPORT_STATUS_API = (id) =>
  `http://127.0.0.1:8000/api/spots/reports/${id}/status/`;

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "RESOLVED", label: "Resolved" },
];

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

function getAccessToken() {
  const possibleKeys = [
    "access",
    "accessToken",
    "access_token",
    "token",
    "jwt",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value) {
      try {
        const parsed = JSON.parse(value);

        if (typeof parsed === "string") return parsed;
        if (parsed?.access) return parsed.access;
        if (parsed?.accessToken) return parsed.accessToken;
        if (parsed?.access_token) return parsed.access_token;
      } catch {
        return value;
      }
    }
  }

  const userData = localStorage.getItem("user");

  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      return (
        parsed?.access ||
        parsed?.accessToken ||
        parsed?.access_token ||
        null
      );
    } catch {
      // The user value is not a JSON object.
    }
  }

  return null;
}

function getAuthHeaders() {
  const token = getAccessToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============================================================
// DATA HELPERS
// ============================================================

function normalizeReports(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getReporterName(report) {
  return (
    report.reported_by_name ||
    report.reporter_name ||
    report.reported_by_email ||
    (report.reported_by ? `User #${report.reported_by}` : "Unknown user")
  );
}

function getSpotName(report) {
  return (
    report.spot_name ||
    report.spot?.name ||
    (report.spot ? `Spot #${report.spot}` : "Unknown spot")
  );
}

function getStatusStyle(status) {
  const styles = {
    PENDING: {
      color: "#b7791f",
      background: "#fff7e6",
    },
    REVIEWED: {
      color: "#2563a6",
      background: "#eaf3ff",
    },
    RESOLVED: {
      color: "#16866d",
      background: "#e6f7f1",
    },
  };

  return styles[status] || {
    color: "#687779",
    background: "#f0f2f3",
  };
}

// ============================================================
// ADMIN REPORTS
// ============================================================

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // FETCH REPORTS
  // ==========================================================

  const fetchReports = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(REPORTS_API, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "You are not authorized to view reports. Please sign in again with an admin or employee account."
          );
        }

        throw new Error(
          `Unable to load reports. Server returned ${response.status}.`
        );
      }

      const data = await response.json();
      setReports(normalizeReports(data));
    } catch (err) {
      setError(
        err.message ||
          "Unable to load reports. Check the backend server and connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ==========================================================
  // REPORT STATISTICS
  // ==========================================================

  const statistics = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "PENDING").length,
      reviewed: reports.filter((r) => r.status === "REVIEWED").length,
      resolved: reports.filter((r) => r.status === "RESOLVED").length,
    }),
    [reports]
  );

  // ==========================================================
  // SEARCH AND FILTER
  // ==========================================================

  const filteredReports = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !searchValue ||
        [
          report.id,
          report.reason,
          getSpotName(report),
          getReporterName(report),
          report.reported_by_email,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(searchValue)
        );

      const matchesStatus =
        statusFilter === "ALL" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  // ==========================================================
  // UPDATE REPORT STATUS
  // ==========================================================

  const updateReportStatus = async (reportId, newStatus) => {
    setUpdatingId(reportId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(REPORT_STATUS_API(reportId), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail =
          responseData?.status?.[0] ||
          responseData?.detail ||
          responseData?.status ||
          `Unable to update report. Server returned ${response.status}.`;

        throw new Error(
          typeof detail === "string" ? detail : JSON.stringify(detail)
        );
      }

      setReports((previousReports) =>
        previousReports.map((report) =>
          report.id === reportId
            ? { ...report, ...responseData, status: newStatus }
            : report
        )
      );

      setSuccess(`Report #${reportId} updated to ${newStatus}.`);
    } catch (err) {
      setError(err.message || "Failed to update report status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================================
  // REUSABLE STATISTIC CARD
  // ==========================================================

  const StatCard = ({ title, value, color, description }) => (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <div
            className="mb-2"
            style={{
              color: "#7c8b8e",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {title}
          </div>

          <div
            className="fw-bold"
            style={{
              color: "#1d2b2e",
              fontSize: "26px",
            }}
          >
            {loading ? "…" : value}
          </div>

          <div
            className="mt-1"
            style={{
              color,
              fontSize: "10px",
              fontWeight: 600,
            }}
          >
            {description || "\u00A0"}
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <AdminLayout>
      {/* PAGE HEADER */}

      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{ color: "#1d2b2e", fontSize: "24px" }}
          >
            Reports
          </h1>

          <p
            className="mb-0"
            style={{ color: "#7c8b8e", fontSize: "13px" }}
          >
            Review reports and manage reported NearSpot content.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-light border rounded-3 px-3"
          style={{
            color: "#536366",
            fontSize: "12px",
            fontWeight: 600,
          }}
          onClick={() => fetchReports(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ALERTS */}

      {error && (
        <div
          className="alert alert-danger rounded-3"
          role="alert"
          style={{ fontSize: "13px" }}
        >
          <div className="d-flex justify-content-between align-items-start gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            />
          </div>
        </div>
      )}

      {success && (
        <div
          className="alert alert-success rounded-3"
          role="status"
          style={{ fontSize: "13px" }}
        >
          <div className="d-flex justify-content-between align-items-start gap-2">
            <span>{success}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss success message"
              onClick={() => setSuccess("")}
            />
          </div>
        </div>
      )}

      {/* REPORT STATISTICS */}

      <div className="row g-3 mb-4">
        <StatCard
          title="TOTAL REPORTS"
          value={statistics.total}
          color="#1d2b2e"
          description="All submitted reports"
        />

        <StatCard
          title="PENDING"
          value={statistics.pending}
          color="#c78318"
          description="Requires review"
        />

        <StatCard
          title="REVIEWED"
          value={statistics.reviewed}
          color="#2563a6"
          description="Reports reviewed"
        />

        <StatCard
          title="RESOLVED"
          value={statistics.resolved}
          color="#16866d"
          description="Reports resolved"
        />
      </div>

      {/* SEARCH AND FILTERS */}

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            <div className="col-12 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  ⌕
                </span>

                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search reports..."
                  aria-label="Search reports"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter reports by status"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                value="ALL"
                disabled
                aria-label="Report type"
                title="The current Report model does not have a report type field."
              >
                <option value="ALL">All report types</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* REPORTED CONTENT TABLE */}

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-0">
          <div className="p-3 p-md-4 border-bottom">
            <h5
              className="fw-semibold mb-1"
              style={{ color: "#1d2b2e", fontSize: "16px" }}
            >
              Reported Content
            </h5>

            <p
              className="mb-0"
              style={{ color: "#8a989a", fontSize: "12px" }}
            >
              Review reports submitted by the NearSpot community.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  {[
                    "REPORT",
                    "SPOT",
                    "REPORTED BY",
                    "STATUS",
                    "CREATED",
                    "ACTION",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3"
                      style={{
                        color: "#7c8b8e",
                        fontSize: "10px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-5"
                      style={{ color: "#8a989a", fontSize: "12px" }}
                    >
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-5"
                      style={{ color: "#9aa6a8", fontSize: "12px" }}
                    >
                      {error
                        ? "Reports could not be loaded. Check the error above."
                        : reports.length === 0
                          ? "No reports have been submitted yet."
                          : "No reports match your search or selected filter."}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const statusStyle = getStatusStyle(report.status);
                    const isUpdating = updatingId === report.id;

                    return (
                      <tr key={report.id}>
                        {/* REPORT */}

                        <td
                          className="px-3 py-3"
                          style={{ minWidth: "220px", maxWidth: "320px" }}
                        >
                          <div
                            className="fw-semibold mb-1"
                            style={{
                              color: "#1d2b2e",
                              fontSize: "12px",
                            }}
                          >
                            Report #{report.id}
                          </div>

                          <div
                            style={{
                              color: "#7c8b8e",
                              fontSize: "12px",
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {report.reason || "No reason provided"}
                          </div>
                        </td>

                        {/* SPOT */}

                        <td
                          className="py-3"
                          style={{
                            color: "#536366",
                            fontSize: "12px",
                            minWidth: "130px",
                          }}
                        >
                          {getSpotName(report)}
                        </td>

                        {/* REPORTED BY */}

                        <td
                          className="py-3"
                          style={{
                            color: "#536366",
                            fontSize: "12px",
                            minWidth: "150px",
                          }}
                        >
                          <div className="fw-semibold">
                            {getReporterName(report)}
                          </div>

                          {report.reported_by_email && (
                            <div
                              className="mt-1"
                              style={{
                                color: "#8a989a",
                                fontSize: "11px",
                              }}
                            >
                              {report.reported_by_email}
                            </div>
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="py-3">
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{
                              color: statusStyle.color,
                              background: statusStyle.background,
                              fontSize: "10px",
                              fontWeight: 600,
                            }}
                          >
                            {report.status || "UNKNOWN"}
                          </span>
                        </td>

                        {/* CREATED */}

                        <td
                          className="py-3"
                          style={{
                            color: "#7c8b8e",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(report.created_at)}
                        </td>

                        {/* ACTION */}

                        <td className="py-3 pe-3 text-end">
                          <div
                            className="d-flex flex-column flex-xl-row justify-content-end gap-2"
                            style={{ minWidth: "125px" }}
                          >
                            {report.status === "PENDING" && (
                              <button
                                type="button"
                                className="btn btn-sm rounded-3"
                                style={{
                                  color: "#2563a6",
                                  background: "#eaf3ff",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                                disabled={isUpdating || updatingId !== null}
                                onClick={() =>
                                  updateReportStatus(report.id, "REVIEWED")
                                }
                              >
                                {isUpdating ? "Updating..." : "Review"}
                              </button>
                            )}

                            {report.status !== "RESOLVED" && (
                              <button
                                type="button"
                                className="btn btn-sm rounded-3"
                                style={{
                                  color: "#16866d",
                                  background: "#e6f7f1",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                                disabled={isUpdating || updatingId !== null}
                                onClick={() =>
                                  updateReportStatus(report.id, "RESOLVED")
                                }
                              >
                                {isUpdating ? "Updating..." : "Resolve"}
                              </button>
                            )}

                            {report.status === "RESOLVED" && (
                              <span
                                style={{
                                  color: "#16866d",
                                  fontSize: "11px",
                                }}
                              >
                                Completed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}

          {!loading && filteredReports.length > 0 && (
            <div
              className="d-flex flex-column flex-sm-row justify-content-between gap-2 px-3 px-md-4 py-3 border-top"
              style={{ color: "#8a989a", fontSize: "11px" }}
            >
              <span>
                Showing {filteredReports.length} of {reports.length} reports
              </span>

              <span>
                {statistics.pending} pending review
                {statistics.pending === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminReports;
