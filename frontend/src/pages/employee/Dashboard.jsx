import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

function StatCard({ title, value, description, accent = "#1d2b2e" }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <div
            className="mb-3"
            style={{ color: "#7c8b8e", fontSize: "12px", fontWeight: 600 }}
          >
            {title}
          </div>

          <div className="fw-bold" style={{ color: accent, fontSize: "28px" }}>
            {value}
          </div>

          <div
            className="mt-2"
            style={{ color: "#9aa6a8", fontSize: "11px" }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <h5
          className="fw-semibold mb-3"
          style={{ color: "#1d2b2e", fontSize: "16px" }}
        >
          {title}
        </h5>
        {children}
      </div>
    </div>
  );
}

function StatisticRow({ label, value, color = "#1d2b2e" }) {
  return (
    <div className="d-flex justify-content-between align-items-center gap-3 py-2 border-bottom">
      <span style={{ color: "#667779", fontSize: "13px" }}>{label}</span>
      <span
        className="fw-semibold text-end"
        style={{ color, fontSize: "14px" }}
      >
        {value}
      </span>
    </div>
  );
}

function formatNumber(value) {
  return (value ?? 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return date.toLocaleString();
}

function getActionStyle(action) {
  switch (action) {
    case "APPROVED":
      return { backgroundColor: "#eaf5ef", color: "#198754" };
    case "REJECTED":
      return { backgroundColor: "#fde8e8", color: "#b42335" };
    default:
      return { backgroundColor: "#eef0f2", color: "#667085" };
  }
}

function getReportStatusStyle(status) {
  switch (status) {
    case "RESOLVED":
      return { backgroundColor: "#eaf5ef", color: "#198754" };
    case "REVIEWED":
      return { backgroundColor: "#eaf1ff", color: "#0d6efd" };
    default:
      return { backgroundColor: "#fff8e8", color: "#b7791f" };
  }
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/spots/employee/dashboard/");
      setDashboard(response.data);

      // Reports are fetched separately so a reports API failure
      // does not prevent the main dashboard from loading.
      try {
        const reportsResponse = await api.get("/spots/reports/");
        const data = reportsResponse.data;

        if (Array.isArray(data)) {
          setReportsList(data);
        } else if (Array.isArray(data?.results)) {
          setReportsList(data.results);
        } else {
          setReportsList([]);
        }
      } catch (reportError) {
        console.error("Unable to load reports:", reportError);
        setReportsList([]);
      }
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        setError(
          "Authentication failed. Please log in again and ensure your access token is included in API requests."
        );
      } else if (status === 403) {
        setError(
          "Access denied. Please log in with an authorized employee account."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            err.message ||
            "Unable to load the employee dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const employee = dashboard?.employee ?? {};
  const spots = dashboard?.spots ?? {};
  const reports = dashboard?.reports ?? {};
  const reviews = dashboard?.my_reviews ?? {};
  const recentActivity = dashboard?.recent_activity ?? [];

  const recentReports = [...reportsList]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 5);

  return (
    <EmployeeLayout>
      {/* PAGE HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{ color: "#1d2b2e", fontSize: "24px" }}
          >
            Employee Dashboard
          </h1>

          <p
            className="mb-0"
            style={{ color: "#7c8b8e", fontSize: "13px" }}
          >
            {employee.name
              ? `Welcome, ${employee.name}. Here's your NearSpot workspace overview.`
              : "Overview of your NearSpot employee workspace."}
          </p>

          {employee.email && (
            <div
              className="mt-1"
              style={{ color: "#8a989a", fontSize: "12px" }}
            >
              {employee.email}
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm rounded-3 px-3"
          onClick={fetchDashboard}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh dashboard"}
        </button>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchDashboard}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      {/* LOADING MESSAGE */}
      {loading && !dashboard && !error && (
        <div className="text-center py-5" style={{ color: "#8a989a" }}>
          Loading dashboard data...
        </div>
      )}

      {/* MAIN STATISTICS */}
      <div className="row g-3">
        <StatCard
          title="TOTAL SPOTS"
          value={loading && !dashboard ? "..." : formatNumber(spots.total)}
          description="All hidden spot submissions"
        />

        <StatCard
          title="PENDING SPOTS"
          value={loading && !dashboard ? "..." : formatNumber(spots.pending)}
          description="Awaiting employee review"
          accent="#d97706"
        />

        <StatCard
          title="APPROVED SPOTS"
          value={loading && !dashboard ? "..." : formatNumber(spots.approved)}
          description="Approved hidden spots"
          accent="#198754"
        />

        <StatCard
          title="TOTAL REPORTS"
          value={loading && !dashboard ? "..." : formatNumber(reports.total)}
          description="Reports submitted by users"
          accent="#0d6efd"
        />
      </div>

      {/* SPOT AND REPORT MANAGEMENT */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-xl-6">
          <SectionCard title="Spot Management">
            <StatisticRow label="Total spots" value={formatNumber(spots.total)} />
            <StatisticRow
              label="Pending spots"
              value={formatNumber(spots.pending)}
              color="#d97706"
            />
            <StatisticRow
              label="Approved spots"
              value={formatNumber(spots.approved)}
              color="#198754"
            />
            <StatisticRow
              label="Rejected spots"
              value={formatNumber(spots.rejected)}
              color="#b42335"
            />
            <StatisticRow
              label="Cancelled spots"
              value={formatNumber(spots.cancelled)}
            />

            <Link
              to="/employee/spots"
              className="btn btn-outline-secondary btn-sm rounded-3 mt-3"
            >
              Open pending spot review
            </Link>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="Report Management">
            <StatisticRow label="Total reports" value={formatNumber(reports.total)} />
            <StatisticRow
              label="Pending reports"
              value={formatNumber(reports.pending)}
              color="#d97706"
            />
            <StatisticRow
              label="Reviewed reports"
              value={formatNumber(reports.reviewed)}
              color="#0d6efd"
            />
            <StatisticRow
              label="Resolved reports"
              value={formatNumber(reports.resolved)}
              color="#198754"
            />

            <Link
              to="/employee/reports"
              className="btn btn-outline-secondary btn-sm rounded-3 mt-3"
            >
              Open report management
            </Link>
          </SectionCard>
        </div>
      </div>

      {/* MY REVIEW ACTIVITY */}
      <div className="row g-3 mt-1">
        <div className="col-12">
          <SectionCard title="My Review Activity">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="p-3 rounded-3" style={{ backgroundColor: "#f5f7f7" }}>
                  <div className="small text-secondary mb-2">Total reviews</div>
                  <div className="fw-bold fs-4">
                    {formatNumber(reviews.total_reviews)}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="p-3 rounded-3" style={{ backgroundColor: "#eaf5ef" }}>
                  <div className="small text-secondary mb-2">Spots approved by me</div>
                  <div className="fw-bold fs-4" style={{ color: "#198754" }}>
                    {formatNumber(reviews.approved)}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="p-3 rounded-3" style={{ backgroundColor: "#fdeeee" }}>
                  <div className="small text-secondary mb-2">Spots rejected by me</div>
                  <div className="fw-bold fs-4" style={{ color: "#b42335" }}>
                    {formatNumber(reviews.rejected)}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* RECENT REVIEW ACTIVITY */}
      <div className="row g-3 mt-1">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5
                    className="fw-semibold mb-1"
                    style={{ color: "#1d2b2e", fontSize: "16px" }}
                  >
                    Recent Review Activity
                  </h5>
                  <p className="mb-0" style={{ color: "#8a989a", fontSize: "12px" }}>
                    Your five latest reviews.
                  </p>
                </div>

                <Link
                  to="/employee/spots"
                  className="btn btn-outline-secondary btn-sm rounded-3"
                >
                  Review pending spots
                </Link>
              </div>

              {loading && !dashboard ? (
                <div className="text-center py-4 text-secondary">
                  Loading recent activity...
                </div>
              ) : error ? (
                <div className="text-secondary small">
                  Recent activity is unavailable until the dashboard loads.
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-4" style={{ color: "#8a989a", fontSize: "13px" }}>
                  You have no review activity yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="small text-secondary">SPOT</th>
                        <th className="small text-secondary">ACTION</th>
                        <th className="small text-secondary">REASON</th>
                        <th className="small text-secondary">DATE</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentActivity.map((activity) => (
                        <tr key={activity.verification_id}>
                          <td className="fw-semibold" style={{ color: "#1d2b2e", fontSize: "13px" }}>
                            {activity.spot_name || `Spot #${activity.spot_id}`}
                          </td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={getActionStyle(activity.action)}
                            >
                              {activity.action}
                            </span>
                          </td>

                          <td style={{ color: "#667779", fontSize: "12px", minWidth: "160px" }}>
                            {activity.reason || "—"}
                          </td>

                          <td style={{ color: "#8a989a", fontSize: "11px", whiteSpace: "nowrap" }}>
                            {formatDate(activity.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT REPORTS */}
      <div className="row g-3 mt-1">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5
                    className="fw-semibold mb-1"
                    style={{ color: "#1d2b2e", fontSize: "16px" }}
                  >
                    Recent Reports
                  </h5>
                  <p className="mb-0" style={{ color: "#8a989a", fontSize: "12px" }}>
                    Latest reports submitted by users.
                  </p>
                </div>

                <Link
                  to="/employee/reports"
                  className="btn btn-outline-secondary btn-sm rounded-3"
                >
                  View all reports
                </Link>
              </div>

              {loading && !dashboard ? (
                <div className="text-center py-4 text-secondary">
                  Loading reports...
                </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-4" style={{ color: "#8a989a", fontSize: "13px" }}>
                  No reports available, or the reports endpoint could not be reached.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="small text-secondary">SPOT</th>
                        <th className="small text-secondary">REASON</th>
                        <th className="small text-secondary">STATUS</th>
                        <th className="small text-secondary">REPORTED ON</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentReports.map((report) => (
                        <tr key={report.id}>
                          <td className="fw-semibold" style={{ color: "#1d2b2e", fontSize: "13px" }}>
                            {report.spot_name || `Spot #${report.spot}`}
                          </td>

                          <td style={{ color: "#667779", fontSize: "12px", minWidth: "180px" }}>
                            {report.reason || "—"}
                          </td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2"
                              style={getReportStatusStyle(report.status)}
                            >
                              {report.status}
                            </span>
                          </td>

                          <td style={{ color: "#8a989a", fontSize: "11px", whiteSpace: "nowrap" }}>
                            {formatDate(report.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="small mt-4 mb-0" style={{ color: "#8a989a", fontSize: "11px" }}>
        Dashboard statistics and employee review activity are calculated by the Django backend.
      </p>
    </EmployeeLayout>
  );
}

export default Dashboard;