
import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const PENDING_API = `${API_BASE}/spots/pending/`;

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken")
  );
}

async function apiRequest(url, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Access token not found. Please log in again.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status}).`;

    try {
      const data = await response.json();
      message =
        data.detail ||
        data.error ||
        data.message ||
        (typeof data === "string" ? data : message);
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getCategoryName(spot) {
  if (spot.category && typeof spot.category === "object") {
    return spot.category.name || "Uncategorized";
  }

  return spot.category_name || "Uncategorized";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function StatusBadge({ status }) {
  const colors = {
    PENDING: ["#fff4d8", "#a66b00"],
    APPROVED: ["#e2f5ec", "#16866d"],
    REJECTED: ["#fde8e8", "#b42335"],
  };

  const [background, color] = colors[status] || [
    "#eef0f2",
    "#667085",
  ];

  return (
    <span
      className="badge rounded-pill px-3 py-2"
      style={{ background, color, fontSize: "10px" }}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function StatCard({ title, value, color }) {
  return (
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
            style={{ color, fontSize: "26px" }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PendingSpots() {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(PENDING_API);
      setSpots(normalizeList(data));
    } catch (err) {
      setError(err.message || "Unable to load pending spots.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const filteredSpots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return spots.filter((spot) => {
      const searchableText = [
        spot.id,
        spot.name,
        spot.description,
        getCategoryName(spot),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [spots, search]);

  const closeDetails = () => {
    if (actionLoading) return;

    setSelectedSpot(null);
    setActionError("");
    setShowRejectForm(false);
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!selectedSpot) return;

    const confirmed = window.confirm(
      `Approve "${selectedSpot.name}"? This will make the spot visible as an approved spot.`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const spotName = selectedSpot.name || `Spot #${selectedSpot.id}`;

      await apiRequest(
        `${API_BASE}/spots/${selectedSpot.id}/approve/`,
        { method: "POST" }
      );

      setSuccessMessage(`"${spotName}" was approved successfully.`);
      setSelectedSpot(null);
      setShowRejectForm(false);
      await fetchSpots();
    } catch (err) {
      setActionError(err.message || "Unable to approve this spot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();

    if (!selectedSpot) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setActionError("Please enter a reason for rejecting this spot.");
      return;
    }

    const confirmed = window.confirm(
      `Reject "${selectedSpot.name}"?`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const spotName = selectedSpot.name || `Spot #${selectedSpot.id}`;

      await apiRequest(
        `${API_BASE}/spots/${selectedSpot.id}/reject/`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      );

      setSuccessMessage(`"${spotName}" was rejected successfully.`);
      setSelectedSpot(null);
      setShowRejectForm(false);
      setRejectionReason("");
      await fetchSpots();
    } catch (err) {
      setActionError(err.message || "Unable to reject this spot.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <EmployeeLayout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{ color: "#1d2b2e", fontSize: "24px" }}
          >
            Pending Spots
          </h1>
          <p
            className="mb-0"
            style={{ color: "#7c8b8e", fontSize: "13px" }}
          >
            Review submitted hidden spots and make approval decisions.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-light border rounded-3 px-3"
          disabled={loading || actionLoading}
          onClick={fetchSpots}
          style={{ fontSize: "12px", fontWeight: 600 }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
          <div className="d-flex justify-content-between gap-2 align-items-center">
            <span>{error}</span>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={fetchSpots}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {actionError && !selectedSpot && (
        <div className="alert alert-danger rounded-3" role="alert">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success rounded-3" role="status">
          {successMessage}
        </div>
      )}

      <div className="row g-3 mb-4">
        <StatCard
          title="PENDING SPOTS"
          value={loading ? "..." : spots.length}
          color="#c78318"
        />
        <StatCard
          title="MATCHING RESULTS"
          value={loading ? "..." : filteredSpots.length}
          color="#1d2b2e"
        />
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <input
            className="form-control"
            type="search"
            placeholder="Search by spot name, description, category, or ID..."
            aria-label="Search pending spots"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="p-3 p-md-4 border-bottom">
          <h2
            className="fw-semibold mb-1"
            style={{ color: "#1d2b2e", fontSize: "16px" }}
          >
            Spots awaiting review
          </h2>
          <p
            className="mb-0"
            style={{ color: "#8a989a", fontSize: "12px" }}
          >
            {loading
              ? "Loading pending submissions..."
              : `${filteredSpots.length} pending spot(s) found.`}
          </p>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                {["SPOT", "CATEGORY", "SUBMITTED", "STATUS", "ACTION"].map(
                  (heading) => (
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
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    Loading pending spots...
                  </td>
                </tr>
              )}

              {!loading && !error && filteredSpots.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-5"
                    style={{ color: "#8a989a", fontSize: "13px" }}
                  >
                    {spots.length === 0
                      ? "There are no pending spots to review."
                      : "No spots match your search."}
                  </td>
                </tr>
              )}

              {!loading &&
                filteredSpots.map((spot) => (
                  <tr key={spot.id}>
                    <td className="px-3 py-3">
                      <div
                        className="fw-semibold"
                        style={{
                          color: "#1d2b2e",
                          fontSize: "13px",
                          minWidth: "130px",
                        }}
                      >
                        {spot.name || `Spot #${spot.id}`}
                      </div>
                      <div
                        className="mt-1"
                        style={{ color: "#9aa6a8", fontSize: "11px" }}
                      >
                        ID: {spot.id}
                      </div>
                    </td>

                    <td
                      style={{
                        color: "#667779",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getCategoryName(spot)}
                    </td>

                    <td
                      style={{
                        color: "#667779",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(spot.created_at || spot.created_on)}
                    </td>

                    <td>
                      <StatusBadge status={spot.status || "PENDING"} />
                    </td>

                    <td className="pe-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-3"
                        onClick={() => {
                          setSelectedSpot(spot);
                          setActionError("");
                          setShowRejectForm(false);
                          setRejectionReason("");
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSpot && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pendingSpotTitle"
          style={{
            background: "rgba(20, 30, 32, 0.55)",
            zIndex: 1050,
            overflowY: "auto",
          }}
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
              closeDetails();
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header">
                <div>
                  <h2
                    className="modal-title fw-bold mb-1"
                    id="pendingSpotTitle"
                    style={{ color: "#1d2b2e", fontSize: "17px" }}
                  >
                    Review spot
                  </h2>
                  <span style={{ color: "#8a989a", fontSize: "12px" }}>
                    Submission ID: {selectedSpot.id}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  disabled={actionLoading}
                  onClick={closeDetails}
                />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <div className="small text-secondary mb-1">SPOT NAME</div>
                  <div className="fw-semibold" style={{ color: "#1d2b2e" }}>
                    {selectedSpot.name || "Unnamed spot"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="small text-secondary mb-1">
                    DESCRIPTION
                  </div>
                  <div
                    style={{
                      color: "#536366",
                      fontSize: "13px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedSpot.description || "No description provided."}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="small text-secondary mb-1">CATEGORY</div>
                    <div style={{ color: "#536366", fontSize: "13px" }}>
                      {getCategoryName(selectedSpot)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="small text-secondary mb-1">STATUS</div>
                    <StatusBadge status={selectedSpot.status || "PENDING"} />
                  </div>
                  <div className="col-6">
                    <div className="small text-secondary mb-1">LATITUDE</div>
                    <div style={{ color: "#536366", fontSize: "13px" }}>
                      {selectedSpot.latitude ??
                        selectedSpot.location?.coordinates?.[1] ??
                        "—"}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="small text-secondary mb-1">LONGITUDE</div>
                    <div style={{ color: "#536366", fontSize: "13px" }}>
                      {selectedSpot.longitude ??
                        selectedSpot.location?.coordinates?.[0] ??
                        "—"}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="small text-secondary mb-1">SUBMITTED</div>
                  <div style={{ color: "#536366", fontSize: "13px" }}>
                    {formatDate(
                      selectedSpot.created_at || selectedSpot.created_on
                    )}
                  </div>
                </div>

                {actionError && (
                  <div className="alert alert-danger py-2" role="alert">
                    {actionError}
                  </div>
                )}

                {showRejectForm && (
                  <form onSubmit={handleReject}>
                    <label
                      className="form-label fw-semibold"
                      htmlFor="rejectionReason"
                    >
                      Reason for rejection
                    </label>
                    <textarea
                      id="rejectionReason"
                      className="form-control mb-2"
                      rows="3"
                      maxLength={1000}
                      required
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      placeholder="Explain why this spot cannot be approved..."
                      disabled={actionLoading}
                    />
                    <div className="d-flex justify-content-end">
                      <button
                        type="submit"
                        className="btn btn-danger rounded-3"
                        disabled={actionLoading || !rejectionReason.trim()}
                      >
                        {actionLoading ? "Rejecting..." : "Confirm rejection"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="modal-footer d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  disabled={actionLoading}
                  onClick={closeDetails}
                >
                  Close
                </button>

                {!showRejectForm && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger rounded-3"
                      disabled={actionLoading}
                      onClick={() => {
                        setActionError("");
                        setShowRejectForm(true);
                      }}
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      className="btn btn-success rounded-3"
                      disabled={actionLoading}
                      onClick={handleApprove}
                    >
                      {actionLoading ? "Approving..." : "Approve"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
}
