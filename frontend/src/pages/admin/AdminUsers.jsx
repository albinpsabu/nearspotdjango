
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// API CONFIGURATION
// ============================================================

const USERS_API = "http://127.0.0.1:8000/api/accounts/users/";

const USER_STATUS_API = (id) =>
  `http://127.0.0.1:8000/api/accounts/users/${id}/status/`;

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

function getAccessToken() {
  const keys = ["access", "accessToken", "access_token", "token", "jwt"];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

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
      // Continue without a token.
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
// RESPONSE HELPERS
// ============================================================

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getUserName(user) {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    user.name ||
    user.full_name ||
    fullName ||
    user.username ||
    user.email ||
    `User #${user.id}`
  );
}

function getJoinedDate(user) {
  return (
    user.date_joined ||
    user.joined_at ||
    user.created_at ||
    user.createdAt ||
    null
  );
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

function isUserActive(user) {
  return user.is_active ?? user.isActive ?? user.active ?? false;
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  if (typeof data?.is_active === "string") return data.is_active;
  if (Array.isArray(data?.is_active)) return data.is_active[0];

  if (typeof data?.status === "string") return data.status;
  if (Array.isArray(data?.status)) return data.status[0];

  return fallback;
}

// ============================================================
// ADMIN USERS
// ============================================================

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Custom confirmation modal state.
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // ==========================================================
  // FETCH USERS
  // ==========================================================

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(USERS_API, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "You are not authorized to view users. Please sign in again with an admin account."
          );
        }

        throw new Error(
          `Unable to load users. Server returned ${response.status}.`
        );
      }

      const data = await response.json();
      setUsers(normalizeUsers(data));
    } catch (err) {
      setError(
        err.message || "Unable to load users. Check the backend connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ==========================================================
  // USER STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    const activeUsers = users.filter(isUserActive).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const now = new Date();

    const newUsers = users.filter((user) => {
      const joined = getJoinedDate(user);
      if (!joined) return false;

      const joinedDate = new Date(joined);

      return (
        !Number.isNaN(joinedDate.getTime()) &&
        joinedDate >= thirtyDaysAgo &&
        joinedDate <= now
      );
    }).length;

    return {
      total: users.length,
      active: activeUsers,
      inactive: users.length - activeUsers,
      newUsers,
    };
  }, [users]);

  // ==========================================================
  // SEARCH AND FILTER
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [
          getUserName(user),
          user.name,
          user.full_name,
          user.username,
          user.email,
          user.id,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );

      const active = isUserActive(user);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        (statusFilter === "INACTIVE" && !active);

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  // ==========================================================
  // OPEN CUSTOM CONFIRMATION MODAL
  // ==========================================================

  const updateUserStatus = (user) => {
    if (updatingId !== null) return;

    setError("");
    setSuccess("");
    setSelectedUser(user);
    setShowStatusModal(true);
  };

  // ==========================================================
  // CLOSE CUSTOM CONFIRMATION MODAL
  // ==========================================================

  const closeStatusModal = () => {
    if (updatingId !== null) return;

    setShowStatusModal(false);
    setSelectedUser(null);
  };

  // ==========================================================
  // CONFIRM ACCOUNT STATUS UPDATE
  // ==========================================================

  const confirmUserStatusUpdate = async () => {
    if (!selectedUser || updatingId !== null) return;

    const user = selectedUser;
    const nextActive = !isUserActive(user);

    setUpdatingId(user.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(USER_STATUS_API(user.id), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          is_active: nextActive,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to update account status. Server returned ${response.status}.`
          )
        );
      }

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                ...data,
                is_active: data.is_active ?? nextActive,
              }
            : item
        )
      );

      setSuccess(
        `${getUserName(user)}'s account has been ${
          nextActive ? "activated" : "deactivated"
        } successfully.`
      );

      setShowStatusModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err.message || "Failed to update the account status.");
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
              color,
              fontSize: "26px",
            }}
          >
            {loading ? "…" : value}
          </div>

          <div
            className="mt-1"
            style={{
              color: "#9aa6a8",
              fontSize: "10px",
            }}
          >
            {description}
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
            style={{
              color: "#1d2b2e",
              fontSize: "24px",
            }}
          >
            User Management
          </h1>

          <p
            className="mb-0"
            style={{
              color: "#7c8b8e",
              fontSize: "13px",
            }}
          >
            Manage NearSpot users and their account status.
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
          onClick={() => fetchUsers(true)}
          disabled={loading || refreshing || updatingId !== null}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
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
        <div className="alert alert-success rounded-3" role="status">
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

      {/* USER STATISTICS */}

      <div className="row g-3 mb-4">
        <StatCard
          title="TOTAL USERS"
          value={statistics.total}
          color="#1d2b2e"
          description="Registered NearSpot users"
        />

        <StatCard
          title="ACTIVE USERS"
          value={statistics.active}
          color="#16866d"
          description="Accounts currently active"
        />

        <StatCard
          title="INACTIVE USERS"
          value={statistics.inactive}
          color="#b42335"
          description="Accounts currently inactive"
        />

        <StatCard
          title="NEW USERS"
          value={statistics.newUsers}
          color="#2f6f9f"
          description="Registered in the last 30 days"
        />
      </div>

      {/* SEARCH AND FILTERS */}

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            <div className="col-12 col-lg-7">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  ⌕
                </span>

                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search users by name or email..."
                  aria-label="Search users"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-5">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter users by status"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTERED USERS TABLE */}

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
              Registered Users
            </h5>

            <p
              className="mb-0"
              style={{
                color: "#8a989a",
                fontSize: "12px",
              }}
            >
              View and manage registered NearSpot users.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  {["USER", "ROLE", "STATUS", "JOINED", "ACTION"].map(
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
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-5"
                      style={{
                        color: "#9aa6a8",
                        fontSize: "12px",
                      }}
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-5"
                      style={{
                        color: "#9aa6a8",
                        fontSize: "12px",
                      }}
                    >
                      {error
                        ? "Users could not be loaded. Check the error above."
                        : users.length === 0
                          ? "No registered users found."
                          : "No users match your search or selected filter."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const active = isUserActive(user);
                    const isUpdating = updatingId === user.id;

                    return (
                      <tr key={user.id}>
                        {/* USER */}

                        <td
                          className="px-3 py-3"
                          style={{ minWidth: "200px" }}
                        >
                          <div
                            className="fw-semibold"
                            style={{
                              color: "#1d2b2e",
                              fontSize: "12px",
                            }}
                          >
                            {getUserName(user)}
                          </div>

                          <div
                            className="mt-1"
                            style={{
                              color: "#8a989a",
                              fontSize: "11px",
                            }}
                          >
                            {user.email || "No email available"}
                          </div>

                          <div
                            className="mt-1"
                            style={{
                              color: "#9aa6a8",
                              fontSize: "10px",
                            }}
                          >
                            ID: {user.id}
                          </div>
                        </td>

                        {/* ROLE */}

                        <td
                          className="py-3"
                          style={{
                            color: "#536366",
                            fontSize: "12px",
                          }}
                        >
                          {user.role || user.user_type || "USER"}
                        </td>

                        {/* STATUS */}

                        <td className="py-3">
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{
                              color: active ? "#16866d" : "#b42335",
                              background: active ? "#e6f7f1" : "#fff0f0",
                              fontSize: "10px",
                              fontWeight: 600,
                            }}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* JOINED */}

                        <td
                          className="py-3"
                          style={{
                            color: "#7c8b8e",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(getJoinedDate(user))}
                        </td>

                        {/* ACTION */}

                        <td className="py-3 pe-3 text-end">
                          <button
                            type="button"
                            className="btn btn-sm rounded-3"
                            style={{
                              color: active ? "#b42335" : "#16866d",
                              background: active ? "#fff0f0" : "#e6f7f1",
                              fontSize: "11px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                            disabled={
                              isUpdating ||
                              updatingId !== null ||
                              user.is_active === undefined
                            }
                            title={
                              user.is_active === undefined
                                ? "The user API must return is_active to manage account status."
                                : ""
                            }
                            onClick={() => updateUserStatus(user)}
                          >
                            {isUpdating
                              ? "Updating..."
                              : active
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}

          {!loading && filteredUsers.length > 0 && (
            <div
              className="d-flex flex-column flex-sm-row justify-content-between gap-2 px-3 px-md-4 py-3 border-top"
              style={{
                color: "#8a989a",
                fontSize: "11px",
              }}
            >
              <span>
                Showing {filteredUsers.length} of {users.length} users
              </span>

              <span>
                {statistics.active} active / {statistics.inactive} inactive
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          CUSTOM ACCOUNT STATUS CONFIRMATION MODAL
      ======================================================== */}

      {showStatusModal && selectedUser && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
          }}
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              updatingId === null
            ) {
              closeStatusModal();
            }
          }}
        >
          <div
            className="bg-white rounded-4 shadow-lg w-100"
            style={{
              maxWidth: "420px",
              animation: "nearSpotModalIn 0.18s ease-out",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-status-title"
          >
            {/* MODAL CONTENT */}

            <div className="p-4">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{
                  width: "52px",
                  height: "52px",
                  backgroundColor: isUserActive(selectedUser)
                    ? "#fff0f0"
                    : "#e6f7f1",
                  color: isUserActive(selectedUser)
                    ? "#b42335"
                    : "#16866d",
                }}
              >
                <span style={{ fontSize: "24px", fontWeight: 700 }}>
                  {isUserActive(selectedUser) ? "!" : "✓"}
                </span>
              </div>

              <h5
                id="account-status-title"
                className="fw-bold mb-2"
                style={{
                  color: "#1d2b2e",
                  fontSize: "20px",
                }}
              >
                {isUserActive(selectedUser)
                  ? "Deactivate account?"
                  : "Activate account?"}
              </h5>

              <p
                className="mb-3"
                style={{
                  color: "#6b7a7d",
                  fontSize: "13px",
                  lineHeight: 1.7,
                }}
              >
                Are you sure you want to{" "}
                <strong>
                  {isUserActive(selectedUser) ? "deactivate" : "activate"}
                </strong>{" "}
                the account for{" "}
                <strong style={{ color: "#1d2b2e" }}>
                  {getUserName(selectedUser)}
                </strong>
                ?
              </p>

              {/* CURRENT AND NEW STATUS */}

              <div
                className="rounded-3 p-3 mb-4"
                style={{
                  backgroundColor: "#f7f9f9",
                  border: "1px solid #e8eded",
                }}
              >
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span style={{ color: "#7c8b8e", fontSize: "12px" }}>
                    Current status
                  </span>

                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{
                      backgroundColor: isUserActive(selectedUser)
                        ? "#e6f7f1"
                        : "#fff0f0",
                      color: isUserActive(selectedUser)
                        ? "#16866d"
                        : "#b42335",
                      fontSize: "11px",
                    }}
                  >
                    {isUserActive(selectedUser) ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center gap-3 mt-3">
                  <span style={{ color: "#7c8b8e", fontSize: "12px" }}>
                    New status
                  </span>

                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{
                      backgroundColor: isUserActive(selectedUser)
                        ? "#fff0f0"
                        : "#e6f7f1",
                      color: isUserActive(selectedUser)
                        ? "#b42335"
                        : "#16866d",
                      fontSize: "11px",
                    }}
                  >
                    {isUserActive(selectedUser) ? "Inactive" : "Active"}
                  </span>
                </div>
              </div>

              {/* MODAL ACTIONS */}

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn rounded-3 px-4"
                  style={{
                    backgroundColor: "#f1f4f4",
                    color: "#536366",
                    border: "1px solid #e1e8e8",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  disabled={updatingId !== null}
                  onClick={closeStatusModal}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn rounded-3 px-4"
                  style={{
                    backgroundColor: isUserActive(selectedUser)
                      ? "#b42335"
                      : "#16866d",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  disabled={updatingId !== null}
                  onClick={confirmUserStatusUpdate}
                >
                  {updatingId === selectedUser.id
                    ? "Updating..."
                    : isUserActive(selectedUser)
                      ? "Yes, deactivate"
                      : "Yes, activate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANIMATION */}

      <style>
        {`
          @keyframes nearSpotModalIn {
            from {
              opacity: 0;
              transform: translateY(8px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </AdminLayout>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminUsers;
