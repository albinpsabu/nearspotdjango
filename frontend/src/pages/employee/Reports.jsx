
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

const STATUS_OPTIONS = ["PENDING", "REVIEWED", "RESOLVED"];

function getStatusStyle(status) {
  switch (String(status || "").toUpperCase()) {
    case "RESOLVED":
      return { background: "#e7f6ec", color: "#187544" };
    case "REVIEWED":
      return { background: "#e8f0ff", color: "#245bc5" };
    default:
      return { background: "#fff4df", color: "#9a6500" };
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function getSpotName(report) {
  return (
    report.spot_name ||
    report.spot?.name ||
    (report.spot_id ? `Spot #${report.spot_id}` : null) ||
    (typeof report.spot === "number" ? `Spot #${report.spot}` : null) ||
    "Unknown spot"
  );
}

function getReporterName(report) {
  return (
    report.reported_by_name ||
    report.reported_by?.name ||
    report.reported_by?.email ||
    report.reported_by?.username ||
    "Unknown user"
  );
}

function getReportReason(report) {
  return (
    report.reason ||
    report.description ||
    report.message ||
    "No reason provided"
  );
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);

        return `${key}: ${message}`;
      })
      .join(" | ");
  }

  return error.message || "Something went wrong.";
}

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await api.get("/spots/reports/");
      const data = response.data;

      if (Array.isArray(data)) {
        setReports(data);
      } else if (Array.isArray(data?.results)) {
        setReports(data.results);
      } else {
        setReports([]);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session may have expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to view reports.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const counts = useMemo(() => {
    const result = {
      total: reports.length,
      pending: 0,
      reviewed: 0,
      resolved: 0,
    };

    reports.forEach((report) => {
      const status = String(report.status || "").toUpperCase();

      if (status === "PENDING") result.pending += 1;
      if (status === "REVIEWED") result.reviewed += 1;
      if (status === "RESOLVED") result.resolved += 1;
    });

    return result;
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const status = String(report.status || "PENDING").toUpperCase();

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      const searchableText = [
        report.id,
        getSpotName(report),
        getReporterName(report),
        getReportReason(report),
        status,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableText.includes(query);
    });
  }, [reports, search, statusFilter]);

  const updateStatus = async (report, newStatus) => {
    if (!report?.id || !STATUS_OPTIONS.includes(newStatus)) return;

    const currentStatus = String(report.status || "").toUpperCase();

    if (currentStatus === newStatus) return;

    const confirmed = window.confirm(
      `Change report #${report.id} status to ${newStatus}?`
    );

    if (!confirmed) return;

    setUpdatingId(report.id);
    setError("");
    setSuccessMessage("");

    try {
      const response = await api.patch(
        `/spots/reports/${report.id}/status/`,
        { status: newStatus }
      );

      const updatedReport = {
        ...report,
        ...(response.data && typeof response.data === "object"
          ? response.data
          : {}),
        status: newStatus,
      };

      setReports((previous) =>
        previous.map((item) =>
          item.id === report.id
            ? { ...item, ...updatedReport }
            : item
        )
      );

      setSelectedReport((previous) =>
        previous?.id === report.id
          ? { ...previous, ...updatedReport }
          : previous
      );

      setSuccessMessage(
        `Report #${report.id} updated to ${newStatus.toLowerCase()}.`
      );
    } catch (err) {
      setError(
        `Unable to update report #${report.id}. ${getErrorMessage(err)}`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <EmployeeLayout>
      <div className="container-fluid px-0">
        {/* Page heading */}
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h1
              className="fw-bold mb-2"
              style={{ color: "#1d2b2e", fontSize: "25px" }}
            >
              Reports Management
            </h1>

            <p className="mb-0" style={{ color: "#7c8b8e", fontSize: "13px" }}>
              Review reports submitted by NearSpot users and manage their status.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary rounded-3"
            onClick={fetchReports}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh reports"}
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="alert alert-danger rounded-3" role="alert">
            <div className="d-flex justify-content-between align-items-start gap-3">
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

        {successMessage && (
          <div className="alert alert-success rounded-3" role="status">
            <div className="d-flex justify-content-between align-items-center gap-3">
              <span>{successMessage}</span>
              <button
                type="button"
                className="btn-close"
                aria-label="Dismiss message"
                onClick={() => setSuccessMessage("")}
              />
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="row g-3 mb-4">
          {[
            {
              title: "Total reports",
              value: counts.total,
              color: "#253438",
            },
            {
              title: "Pending",
              value: counts.pending,
              color: "#b7791f",
            },
            {
              title: "Reviewed",
              value: counts.reviewed,
              color: "#245bc5",
            },
            {
              title: "Resolved",
              value: counts.resolved,
              color: "#187544",
            },
          ].map((item) => (
            <div className="col-12 col-sm-6 col-xl-3" key={item.title}>
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-4">
                  <div
                    className="mb-3"
                    style={{ color: "#7c8b8e", fontSize: "12px" }}
                  >
                    {item.title}
                  </div>

                  <div
                    className="fw-bold"
                    style={{ fontSize: "29px", color: item.color }}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Report table */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <h5 className="fw-semibold mb-1" style={{ color: "#1d2b2e" }}>
                  User Reports
                </h5>
                <p className="mb-0" style={{ color: "#8a989a", fontSize: "12px" }}>
                  {filteredReports.length} report(s) displayed
                </p>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <input
                  type="search"
                  className="form-control rounded-3"
                  placeholder="Search reports..."
                  aria-label="Search reports"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ width: "220px", maxWidth: "100%" }}
                />

                <select
                  className="form-select rounded-3"
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  style={{ width: "160px", maxWidth: "100%" }}
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-secondary mb-2" />
                <div className="small text-secondary">Loading reports...</div>
              </div>
            ) : error && reports.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-secondary mb-3">
                  Reports could not be loaded.
                </p>
                <button
                  type="button"
                  className="btn btn-dark rounded-3"
                  onClick={fetchReports}
                >
                  Try again
                </button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-2" style={{ color: "#8a989a" }}>
                  No matching reports found.
                </div>
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th className="small text-secondary">REPORT</th>
                      <th className="small text-secondary">SPOT</th>
                      <th className="small text-secondary">REPORTED BY</th>
                      <th className="small text-secondary">REASON</th>
                      <th className="small text-secondary">STATUS</th>
                      <th className="small text-secondary">DATE</th>
                      <th className="small text-secondary">ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredReports.map((report) => {
                      const status = String(
                        report.status || "PENDING"
                      ).toUpperCase();

                      const isUpdating = updatingId === report.id;

                      return (
                        <tr key={report.id}>
                          <td className="fw-semibold" style={{ color: "#344448" }}>
                            #{report.id}
                          </td>

                          <td style={{ minWidth: "130px" }}>
                            <div className="fw-semibold small">
                              {getSpotName(report)}
                            </div>
                          </td>

                          <td
                            className="small"
                            style={{ minWidth: "130px", color: "#667779" }}
                          >
                            {getReporterName(report)}
                          </td>

                          <td
                            className="small"
                            style={{
                              minWidth: "180px",
                              maxWidth: "260px",
                              color: "#667779",
                            }}
                          >
                            <div
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {getReportReason(report)}
                            </div>
                          </td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={getStatusStyle(status)}
                            >
                              {status}
                            </span>
                          </td>

                          <td
                            className="small"
                            style={{ minWidth: "150px", color: "#8a989a" }}
                          >
                            {formatDate(report.created_at)}
                          </td>

                          <td style={{ minWidth: "190px" }}>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm rounded-3"
                                onClick={() => setSelectedReport(report)}
                              >
                                Details
                              </button>

                              {status === "PENDING" && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm rounded-3"
                                  disabled={isUpdating}
                                  onClick={() => updateStatus(report, "REVIEWED")}
                                >
                                  {isUpdating ? "Saving..." : "Review"}
                                </button>
                              )}

                              {status === "REVIEWED" && (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm rounded-3"
                                  disabled={isUpdating}
                                  onClick={() => updateStatus(report, "RESOLVED")}
                                >
                                  {isUpdating ? "Saving..." : "Resolve"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 mb-0" style={{ color: "#8a989a", fontSize: "11px" }}>
          Report status changes are saved through the Django API.
        </p>
      </div>

      {/* Report details modal */}
      {selectedReport && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{
            background: "rgba(15, 23, 30, 0.55)",
            zIndex: 1050,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedReport(null);
            }
          }}
        >
          <div
            className="card border-0 shadow rounded-4 w-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-details-title"
            style={{ maxWidth: "540px", maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <h5
                    id="report-details-title"
                    className="fw-bold mb-1"
                    style={{ color: "#1d2b2e" }}
                  >
                    Report #{selectedReport.id}
                  </h5>
                  <p className="text-secondary small mb-0">
                    Report details and current status
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close details"
                  onClick={() => setSelectedReport(null)}
                />
              </div>

              <div className="mb-3">
                <div className="small text-secondary mb-1">Spot</div>
                <div className="fw-semibold">{getSpotName(selectedReport)}</div>
              </div>

              <div className="mb-3">
                <div className="small text-secondary mb-1">Reported by</div>
                <div>{getReporterName(selectedReport)}</div>
              </div>

              <div className="mb-3">
                <div className="small text-secondary mb-1">Reason</div>
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {getReportReason(selectedReport)}
                </div>
              </div>

              <div className="mb-3">
                <div className="small text-secondary mb-1">Submitted on</div>
                <div>{formatDate(selectedReport.created_at)}</div>
              </div>

              <div className="mb-4">
                <div className="small text-secondary mb-2">Current status</div>
                <span
                  className="badge rounded-pill px-3 py-2"
                  style={getStatusStyle(selectedReport.status)}
                >
                  {String(selectedReport.status || "PENDING").toUpperCase()}
                </span>
              </div>

              <div className="d-flex flex-wrap justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-3"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </button>

                {String(selectedReport.status).toUpperCase() === "PENDING" && (
                  <button
                    type="button"
                    className="btn btn-primary rounded-3"
                    disabled={updatingId === selectedReport.id}
                    onClick={() => updateStatus(selectedReport, "REVIEWED")}
                  >
                    Mark as reviewed
                  </button>
                )}

                {String(selectedReport.status).toUpperCase() === "REVIEWED" && (
                  <button
                    type="button"
                    className="btn btn-success rounded-3"
                    disabled={updatingId === selectedReport.id}
                    onClick={() => updateStatus(selectedReport, "RESOLVED")}
                  >
                    Mark as resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
}

export default Reports;
