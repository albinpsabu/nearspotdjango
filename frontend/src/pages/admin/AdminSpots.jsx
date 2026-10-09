// ============================================================
// IMPORTS
// ============================================================

import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// ADMIN SPOTS
// ============================================================

function AdminSpots() {
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

        <div className="d-flex align-items-center gap-2">
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
      </div>

      {/* ======================================================
          SPOT STATISTICS
      ======================================================= */}

      <div className="row g-3 mb-4">
        {/* ----------------------------------------------------
            ALL SPOTS
        ----------------------------------------------------- */}

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
                ALL SPOTS
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

        {/* ----------------------------------------------------
            PENDING
        ----------------------------------------------------- */}

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
                PENDING
              </div>

              <div
                className="fw-bold"
                style={{
                  color: "#c78318",
                  fontSize: "26px",
                }}
              >
                —
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            APPROVED
        ----------------------------------------------------- */}

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
                APPROVED
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

        {/* ----------------------------------------------------
            REJECTED
        ----------------------------------------------------- */}

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
                REJECTED
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
      </div>

      {/* ======================================================
          FILTER / SEARCH AREA
      ======================================================= */}

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            {/* ------------------------------------------------
                SEARCH
            ------------------------------------------------- */}

            <div className="col-12 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  ⌕
                </span>

                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search spots..."
                  aria-label="Search spots"
                />
              </div>
            </div>

            {/* ------------------------------------------------
                STATUS FILTER
            ------------------------------------------------- */}

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                defaultValue="ALL"
                aria-label="Filter spots by status"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* ------------------------------------------------
                CATEGORY FILTER
            ------------------------------------------------- */}

            <div className="col-12 col-sm-6 col-lg-3">
              <select
                className="form-select"
                defaultValue="ALL"
                aria-label="Filter spots by category"
              >
                <option value="ALL">All categories</option>
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
              Review submitted spots and manage their status.
            </p>
          </div>

          {/* --------------------------------------------------
              RESPONSIVE TABLE
          --------------------------------------------------- */}

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
                    SPOT
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
                    CATEGORY
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
                    CREATED
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
                    No spot data loaded yet.
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

export default AdminSpots;