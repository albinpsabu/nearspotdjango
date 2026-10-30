
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../services/api";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "RESOLVED", label: "Resolved" },
];

function normalizeReports(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);

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
    (report.reported_by
      ? `User #${report.reported_by}`
      : "Unknown user")
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
    PENDING: { color: "#8A6500", background: "#FFF5D6" },
    REVIEWED: { color: "#805B16", background: "#FFF5D6" },
    RESOLVED: { color: "#6B5200", background: "#FFF5D6" },
  };

  return styles[status] || {
    color: "#666666",
    background: "#f0f2f3",
  };
}

function getApiError(error, fallback) {
  if (error.response?.status === 401) {
    return "Authentication failed. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "Access denied. Administrator or employee permission is required.";
  }

  const data = error.response?.data;

  const detail =
    data?.detail ||
    data?.error ||
    data?.message ||
    data?.status?.[0];

  if (typeof detail === "string") return detail;
  if (detail) return JSON.stringify(detail);

  return error.message || fallback;
}

function StatCard({ title, value, color, description, loading }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card shadow-sm rounded-4 h-100 reports-theme-card">
        <div className="card-body p-4">
          <div
            className="mb-2"
            style={{
              color: "#666666",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {title}
          </div>

          <div
            className="fw-bold"
            style={{ color: "#292929", fontSize: "26px" }}
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
}

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load reports using the shared authenticated Axios client.
  const fetchReports = useCallback(async (showRefresh = false, signal) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/spots/reports/", { signal });

      if (!signal?.aborted) {
        setReports(normalizeReports(response.data));
      }
    } catch (err) {
      if (signal?.aborted || err.code === "ERR_CANCELED") return;

      console.error("Failed to load reports:", err);
      setError(getApiError(err, "Unable to load reports."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchReports(false, controller.signal);

    return () => controller.abort();
  }, [fetchReports]);

  const statistics = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "PENDING").length,
      reviewed: reports.filter((r) => r.status === "REVIEWED").length,
      resolved: reports.filter((r) => r.status === "RESOLVED").length,
    }),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        [
          report.id,
          report.reason,
          getSpotName(report),
          getReporterName(report),
          report.reported_by_email,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "ALL" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  // Update the report status through the authenticated API.
  const updateReportStatus = async (reportId, newStatus) => {
    if (updatingId !== null) return;

    setUpdatingId(reportId);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(
        `/spots/reports/${reportId}/status/`,
        { status: newStatus }
      );

      setReports((previous) =>
        previous.map((report) =>
          String(report.id) === String(reportId)
            ? {
                ...report,
                ...(response.data || {}),
                status: newStatus,
              }
            : report
        )
      );

      setSuccess(`Report #${reportId} updated to ${newStatus}.`);
    } catch (err) {
      console.error("Failed to update report status:", err);
      setError(getApiError(err, "Failed to update report status."));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <style>{`
        .reports-theme-card {
          border: 1px solid #E5E5E5 !important;
          border-top: 3px solid #FFC21A !important;
          background: #FFFFFF;
        }
        .reports-theme-card .card-body {
          background-color: #FFFFFF;
        }
        .reports-search-icon {
          background: #FFFFFF !important;
          color: #8A6500;
          border: 1px solid #E5E5E5 !important;
          border-right: 0 !important;
          border-radius: 10px 0 0 10px !important;
        }
        .reports-search-input {
          border: 1px solid #E5E5E5 !important;
          border-left: 0 !important;
          border-radius: 0 10px 10px 0 !important;
          box-shadow: none !important;
        }
        .reports-search-input:focus,
        .reports-filter-select:focus {
          border-color: #FFC21A !important;
          box-shadow: 0 0 0 3px rgba(255, 194, 26, 0.22) !important;
          outline: none;
        }
        .reports-filter-select {
          border-color: #E5E5E5;
          border-radius: 10px;
          box-shadow: none;
        }
        .reports-theme-card .table thead th {
          background-color: #FFF9E8;
        }
      `}</style>
      {/* Page header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{ color: "#292929", fontSize: "24px" }}
          >
            Reports
          </h1>

          <p
            className="mb-0"
            style={{ color: "#666666", fontSize: "13px" }}
          >
            Review reports and manage reported NearSpot content.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-light border rounded-3 px-3"
          style={{
            color: "#555555",
            fontSize: "12px",
            fontWeight: 600,
          }}
          onClick={() => fetchReports(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Alerts */}
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

      {/* Report statistics */}
      <div className="row g-3 mb-4">
        <StatCard
          title="TOTAL REPORTS"
          value={statistics.total}
          color="#292929"
          description="All submitted reports"
          loading={loading}
        />
        <StatCard
          title="PENDING"
          value={statistics.pending}
          color="#A87400"
          description="Requires review"
          loading={loading}
        />
        <StatCard
          title="REVIEWED"
          value={statistics.reviewed}
          color="#2563a6"
          description="Reports reviewed"
          loading={loading}
        />
        <StatCard
          title="RESOLVED"
          value={statistics.resolved}
          color="#8A6500"
          description="Reports resolved"
          loading={loading}
        />
      </div>

      {/* Search and filters */}
      <div className="card shadow-sm rounded-4 mb-3 reports-theme-card">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            <div className="col-12 col-lg-6">
              <div className="input-group">
                <span className="input-group-text reports-search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  className="form-control reports-search-input"
                  placeholder="Search reports..."
                  aria-label="Search reports"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select reports-filter-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter reports by status"
              >
                <option value="ALL">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select reports-filter-select"
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

      {/* Reports table */}
      <div className="card shadow-sm rounded-4 overflow-hidden reports-theme-card">
        <div className="card-body p-0">
          <div className="p-3 p-md-4 border-bottom">
            <h5
              className="fw-semibold mb-1"
              style={{ color: "#292929", fontSize: "16px" }}
            >
              Reported Content
            </h5>

            <p
              className="mb-0"
              style={{ color: "#777777", fontSize: "12px" }}
            >
              Review reports submitted by the NearSpot community.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead style={{ backgroundColor: "#FFF9E8" }}>
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
                        color: "#666666",
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
                    <td colSpan="6" className="text-center py-5 text-muted">
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      {error && reports.length === 0
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
                        <td
                          className="px-3 py-3"
                          style={{
                            minWidth: "220px",
                            maxWidth: "320px",
                          }}
                        >
                          <div
                            className="fw-semibold mb-1"
                            style={{
                              color: "#292929",
                              fontSize: "12px",
                            }}
                          >
                            Report #{report.id}
                          </div>

                          <div
                            style={{
                              color: "#666666",
                              fontSize: "12px",
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {report.reason || "No reason provided"}
                          </div>
                        </td>

                        <td
                          className="py-3"
                          style={{
                            color: "#555555",
                            fontSize: "12px",
                            minWidth: "130px",
                          }}
                        >
                          {getSpotName(report)}
                        </td>

                        <td
                          className="py-3"
                          style={{
                            color: "#555555",
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
                                color: "#777777",
                                fontSize: "11px",
                              }}
                            >
                              {report.reported_by_email}
                            </div>
                          )}
                        </td>

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

                        <td
                          className="py-3"
                          style={{
                            color: "#666666",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(report.created_at)}
                        </td>

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
                                  background: "#FFF5D6",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                                disabled={updatingId !== null}
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
                                  color: "#8A6500",
                                  background: "#FFF5D6",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                                disabled={updatingId !== null}
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
                                  color: "#8A6500",
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

          {!loading && filteredReports.length > 0 && (
            <div
              className="d-flex flex-column flex-sm-row justify-content-between gap-2 px-3 px-md-4 py-3 border-top"
              style={{ color: "#777777", fontSize: "11px" }}
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

export default AdminReports;
