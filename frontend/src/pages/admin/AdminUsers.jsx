// ============================================================
// IMPORTS
// ============================================================

import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// ADMIN USERS
// ============================================================

function AdminUsers() {
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
        >
          Refresh
        </button>
      </div>

      {/* ======================================================
          USER STATISTICS
      ======================================================= */}

      <div className="row g-3 mb-4">
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
                TOTAL USERS
              </div>

              <div
                className="fw-bold"
                style={{
                  color: "#1d2b2e",
                  fontSize: "26px",
                }}
              >
                —
              </div>
            </div>
          </div>
        </div>

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
                ACTIVE USERS
              </div>

              <div
                className="fw-bold"
                style={{
                  color: "#16866d",
                  fontSize: "26px",
                }}
              >
                —
              </div>
            </div>
          </div>
        </div>

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
                INACTIVE USERS
              </div>

              <div
                className="fw-bold"
                style={{
                  color: "#b42335",
                  fontSize: "26px",
                }}
              >
                —
              </div>
            </div>
          </div>
        </div>

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
                NEW USERS
              </div>

              <div
                className="fw-bold"
                style={{
                  color: "#2f6f9f",
                  fontSize: "26px",
                }}
              >
                —
              </div>

              <div
                className="mt-1"
                style={{
                  color: "#9aa6a8",
                  fontSize: "10px",
                }}
              >
                Recent registrations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          SEARCH AND FILTERS
      ======================================================= */}

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
                  placeholder="Search users by email..."
                  aria-label="Search users"
                />
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <select
                className="form-select"
                defaultValue="ALL"
                aria-label="Filter users by status"
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                defaultValue="USER"
                aria-label="Filter users by role"
              >
                <option value="USER">Users</option>
                <option value="ALL">All roles</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          USERS TABLE
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
                  <th
                    className="px-3 px-md-4 py-3"
                    style={{
                      color: "#7c8b8e",
                      fontSize: "10px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    USER
                  </th>

                  <th
                    className="py-3"
                    style={{
                      color: "#7c8b8e",
                      fontSize: "10px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ROLE
                  </th>

                  <th
                    className="py-3"
                    style={{
                      color: "#7c8b8e",
                      fontSize: "10px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    STATUS
                  </th>

                  <th
                    className="py-3"
                    style={{
                      color: "#7c8b8e",
                      fontSize: "10px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    JOINED
                  </th>

                  <th
                    className="py-3 pe-3 pe-md-4 text-end"
                    style={{
                      color: "#7c8b8e",
                      fontSize: "10px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-5"
                    style={{
                      color: "#9aa6a8",
                      fontSize: "12px",
                    }}
                  >
                    No user data loaded yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminUsers;