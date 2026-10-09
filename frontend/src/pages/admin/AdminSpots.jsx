
 // ============================================================
// IMPORTS
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// API CONFIGURATION
// ============================================================

const SPOTS_API =
  "http://127.0.0.1:8000/api/spots/admin/spots/";

const CATEGORIES_API =
  "http://127.0.0.1:8000/api/spots/categories/";

// ============================================================
// AUTHENTICATION HELPER
// ============================================================

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken")
  );
}

// ============================================================
// API RESPONSE HELPER
// ============================================================

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
      const errorData = await response.json();

      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else if (typeof errorData.error === "string") {
        message = errorData.error;
      } else if (errorData.message) {
        message = errorData.message;
      }
    } catch {
      // Keep the default HTTP error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================================
// NORMALIZE API LIST RESPONSES
// ============================================================

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

// ============================================================
// REUSABLE STATISTIC CARD
// ============================================================

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
            style={{
              color,
              fontSize: "26px",
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }) {
  const styles = {
    PENDING: {
      background: "#fff4d8",
      color: "#a66b00",
    },
    APPROVED: {
      background: "#e2f5ec",
      color: "#16866d",
    },
    REJECTED: {
      background: "#fde8e8",
      color: "#b42335",
    },
    CANCELLED: {
      background: "#eef0f2",
      color: "#667085",
    },
  };

  const normalizedStatus = (status || "UNKNOWN").toUpperCase();
  const style = styles[normalizedStatus] || styles.CANCELLED;

  return (
    <span
      className="badge rounded-pill px-3 py-2"
      style={{
        ...style,
        fontSize: "10px",
        fontWeight: 600,
      }}
    >
      {normalizedStatus}
    </span>
  );
}

// ============================================================
// ADMIN SPOTS
// ============================================================

function AdminSpots() {
  // ============================================================
  // STATE
  // ============================================================

  const [spots, setSpots] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [error, setError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [selectedSpot, setSelectedSpot] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================
  // FETCH SPOTS
  // ============================================================

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(SPOTS_API);
      setSpots(normalizeList(data));
    } catch (err) {
      setError(err.message || "Unable to load spots.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // FETCH CATEGORIES
  // ============================================================

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError("");

    try {
      const data = await apiRequest(CATEGORIES_API);
      setCategories(normalizeList(data));
    } catch (err) {
      setCategoriesError(
        err.message || "Unable to load categories."
      );
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // ============================================================
  // INITIAL DATA LOAD
  // ============================================================

  useEffect(() => {
    fetchSpots();
    fetchCategories();
  }, [fetchSpots, fetchCategories]);

  // ============================================================
  // GET CATEGORY NAME
  // ============================================================

  const getCategoryName = (spot) => {
    if (typeof spot.category === "object" && spot.category !== null) {
      return spot.category.name || `Category ${spot.category.id ?? ""}`;
    }

    const category = categories.find(
      (item) => String(item.id) === String(spot.category)
    );

    return category?.name || "Uncategorized";
  };

  // ============================================================
  // FILTER SPOTS
  // ============================================================

  const filteredSpots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return spots.filter((spot) => {
      const name = String(spot.name || "").toLowerCase();
      const description = String(spot.description || "").toLowerCase();
      const categoryName = getCategoryName(spot).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        description.includes(query) ||
        categoryName.includes(query) ||
        String(spot.id).includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(spot.status || "").toUpperCase() === statusFilter;

      const spotCategoryId =
        typeof spot.category === "object" && spot.category !== null
          ? spot.category.id
          : spot.category;

      const matchesCategory =
        categoryFilter === "ALL" ||
        String(spotCategoryId) === String(categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [spots, search, statusFilter, categoryFilter, categories]);

  // ============================================================
  // SPOT STATISTICS
  // ============================================================

  const statistics = useMemo(() => {
    return {
      total: spots.length,
      pending: spots.filter(
        (spot) => spot.status === "PENDING"
      ).length,
      approved: spots.filter(
        (spot) => spot.status === "APPROVED"
      ).length,
      rejected: spots.filter(
        (spot) => spot.status === "REJECTED"
      ).length,
    };
  }, [spots]);

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString();
  };

  // ============================================================
  // OPEN SPOT DETAILS
  // ============================================================

  const handleViewSpot = (spot) => {
    setActionError("");
    setSuccessMessage("");
    setSelectedSpot(spot);
  };

  // ============================================================
  // UPDATE SPOT STATUS
  // ============================================================

  const handleStatusUpdate = async (spot, nextStatus) => {
    const confirmed = window.confirm(
      `Are you sure you want to change "${spot.name}" to ${nextStatus}?`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await apiRequest(
        `${SPOTS_API}${spot.id}/status/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      setSuccessMessage(
        `"${spot.name}" status updated to ${nextStatus}.`
      );

      setSelectedSpot(null);
      await fetchSpots();
    } catch (err) {
      setActionError(
        err.message || "Unable to update spot status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // DELETE SPOT
  // ============================================================

  const handleDeleteSpot = async (spot) => {
    const confirmed = window.confirm(
      `Delete "${spot.name}" permanently? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await apiRequest(`${SPOTS_API}${spot.id}/`, {
        method: "DELETE",
      });

      setSuccessMessage(`"${spot.name}" was deleted.`);
      setSelectedSpot(null);

      await fetchSpots();
    } catch (err) {
      setActionError(
        err.message || "Unable to delete spot."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <AdminLayout>
      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{
              color: "#1d2b2e",
              fontSize: "24px",
            }}
          >
            Spot Management
          </h1>

          <p
            className="mb-0"
            style={{
              color: "#7c8b8e",
              fontSize: "13px",
            }}
          >
            Review and manage hidden spots submitted to NearSpot.
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
          onClick={() => {
            fetchSpots();
            fetchCategories();
          }}
          disabled={loading || categoriesLoading}
        >
          {loading || categoriesLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ======================================================
          ERROR AND SUCCESS MESSAGES
      ======================================================= */}

      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
          <div className="d-flex justify-content-between align-items-center gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={fetchSpots}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {categoriesError && (
        <div className="alert alert-warning rounded-3" role="alert">
          Categories could not be loaded: {categoriesError}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger rounded-3" role="alert">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success rounded-3" role="status">
          {successMessage}
        </div>
      )}

      {/* ======================================================
          SPOT STATISTICS
      ======================================================= */}

      <div className="row g-3 mb-4">
        <StatCard
          title="ALL SPOTS"
          value={loading ? "..." : statistics.total}
          color="#1d2b2e"
        />

        <StatCard
          title="PENDING"
          value={loading ? "..." : statistics.pending}
          color="#c78318"
        />

        <StatCard
          title="APPROVED"
          value={loading ? "..." : statistics.approved}
          color="#16866d"
        />

        <StatCard
          title="REJECTED"
          value={loading ? "..." : statistics.rejected}
          color="#b42335"
        />
      </div>

      {/* ======================================================
          FILTER AND SEARCH
      ======================================================= */}

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            {/* SEARCH */}

            <div className="col-12 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  ⌕
                </span>

                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by name, description, category, or ID..."
                  aria-label="Search spots"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            {/* STATUS FILTER */}

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter spots by status"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* CATEGORY FILTER */}

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                aria-label="Filter spots by category"
              >
                <option value="ALL">All categories</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          SPOTS TABLE
      ======================================================= */}

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-0">
          <div className="p-3 p-md-4 border-bottom">
            <h5
              className="fw-semibold mb-1"
              style={{
                color: "#1d2b2e",
                fontSize: "16px",
              }}
            >
              All Hidden Spots
            </h5>

            <p
              className="mb-0"
              style={{
                color: "#8a989a",
                fontSize: "12px",
              }}
            >
              Showing {filteredSpots.length} of {spots.length} spots.
            </p>
          </div>

          {/* --------------------------------------------------
              RESPONSIVE TABLE
          --------------------------------------------------- */}

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  {["SPOT", "CATEGORY", "STATUS", "CREATED", "ACTION"].map(
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
                    <td
                      colSpan="5"
                      className="text-center py-5"
                      style={{
                        color: "#9aa6a8",
                        fontSize: "12px",
                      }}
                    >
                      Loading spots...
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  filteredSpots.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-5"
                        style={{
                          color: "#9aa6a8",
                          fontSize: "12px",
                        }}
                      >
                        No spots match your search or filters.
                      </td>
                    </tr>
                  )}

                {!loading &&
                  filteredSpots.map((spot) => (
                    <tr key={spot.id}>
                      {/* SPOT */}

                      <td className="px-3 py-3">
                        <div
                          className="fw-semibold"
                          style={{
                            color: "#1d2b2e",
                            fontSize: "13px",
                            minWidth: "140px",
                          }}
                        >
                          {spot.name || `Spot #${spot.id}`}
                        </div>

                        <div
                          className="mt-1"
                          style={{
                            color: "#9aa6a8",
                            fontSize: "11px",
                          }}
                        >
                          ID: {spot.id}
                        </div>
                      </td>

                      {/* CATEGORY */}

                      <td
                        style={{
                          color: "#667779",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getCategoryName(spot)}
                      </td>

                      {/* STATUS */}

                      <td>
                        <StatusBadge status={spot.status} />
                      </td>

                      {/* CREATED */}

                      <td
                        style={{
                          color: "#667779",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(
                          spot.created_at || spot.created_on
                        )}
                      </td>

                      {/* ACTION */}

                      <td className="pe-3 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary rounded-3"
                          onClick={() => handleViewSpot(spot)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================
          SPOT DETAILS MODAL
      ======================================================= */}

      {selectedSpot && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spotDetailsTitle"
          style={{
            background: "rgba(20, 30, 32, 0.55)",
            zIndex: 1050,
            overflowY: "auto",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              setSelectedSpot(null);
              setActionError("");
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header">
                <h5
                  className="modal-title fw-bold"
                  id="spotDetailsTitle"
                  style={{
                    color: "#1d2b2e",
                    fontSize: "17px",
                  }}
                >
                  Spot Details
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  disabled={actionLoading}
                  onClick={() => {
                    setSelectedSpot(null);
                    setActionError("");
                  }}
                />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <div
                    className="mb-1"
                    style={{
                      color: "#8a989a",
                      fontSize: "11px",
                    }}
                  >
                    SPOT NAME
                  </div>

                  <div
                    className="fw-semibold"
                    style={{
                      color: "#1d2b2e",
                      fontSize: "15px",
                    }}
                  >
                    {selectedSpot.name || "Unnamed spot"}
                  </div>
                </div>

                <div className="mb-3">
                  <div
                    className="mb-1"
                    style={{
                      color: "#8a989a",
                      fontSize: "11px",
                    }}
                  >
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
                    <div
                      className="mb-1"
                      style={{
                        color: "#8a989a",
                        fontSize: "11px",
                      }}
                    >
                      CATEGORY
                    </div>

                    <div
                      style={{
                        color: "#536366",
                        fontSize: "13px",
                      }}
                    >
                      {getCategoryName(selectedSpot)}
                    </div>
                  </div>

                  <div className="col-6">
                    <div
                      className="mb-1"
                      style={{
                        color: "#8a989a",
                        fontSize: "11px",
                      }}
                    >
                      STATUS
                    </div>

                    <StatusBadge status={selectedSpot.status} />
                  </div>
                </div>

                <div className="mb-3">
                  <div
                    className="mb-1"
                    style={{
                      color: "#8a989a",
                      fontSize: "11px",
                    }}
                  >
                    CREATED
                  </div>

                  <div
                    style={{
                      color: "#536366",
                      fontSize: "13px",
                    }}
                  >
                    {formatDate(
                      selectedSpot.created_at ||
                        selectedSpot.created_on
                    )}
                  </div>
                </div>

                {/* ACTION ERROR */}

                {actionError && (
                  <div
                    className="alert alert-danger py-2 mb-0"
                    role="alert"
                  >
                    {actionError}
                  </div>
                )}
              </div>

              <div className="modal-footer d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  disabled={actionLoading}
                  onClick={() => {
                    setSelectedSpot(null);
                    setActionError("");
                  }}
                >
                  Close
                </button>

                {selectedSpot.status !== "APPROVED" && (
                  <button
                    type="button"
                    className="btn btn-success rounded-3"
                    disabled={actionLoading}
                    onClick={() =>
                      handleStatusUpdate(selectedSpot, "APPROVED")
                    }
                  >
                    Approve
                  </button>
                )}

                {selectedSpot.status !== "REJECTED" && (
                  <button
                    type="button"
                    className="btn btn-outline-danger rounded-3"
                    disabled={actionLoading}
                    onClick={() =>
                      handleStatusUpdate(selectedSpot, "REJECTED")
                    }
                  >
                    Reject
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-danger rounded-3"
                  disabled={actionLoading}
                  onClick={() => handleDeleteSpot(selectedSpot)}
                >
                  {actionLoading ? "Processing..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminSpots;
