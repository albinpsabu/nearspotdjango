// ============================================================
// IMPORTS
// ============================================================

import AdminLayout from "../../components/admin/AdminLayout";

// ============================================================
// ADMIN CATEGORIES
// ============================================================

function AdminCategories() {
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
            Category Management
          </h1>

          <p
            className="mb-0"
            style={{
              color: "#7c8b8e",
              fontSize: "13px",
            }}
          >
            Manage the categories available for hidden spots.
          </p>
        </div>

        <button
          type="button"
          className="btn rounded-3 px-3 text-white"
          style={{
            backgroundColor: "#20d9ae",
            borderColor: "#20d9ae",
            color: "#06352b",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          + Add Category
        </button>
      </div>

      {/* ======================================================
          CATEGORY OVERVIEW
      ======================================================= */}

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-4">
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
                TOTAL CATEGORIES
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

              <div
                className="mt-1"
                style={{
                  color: "#9aa6a8",
                  fontSize: "10px",
                }}
              >
                Available spot categories
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
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
                ACTIVE CATEGORIES
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

              <div
                className="mt-1"
                style={{
                  color: "#9aa6a8",
                  fontSize: "10px",
                }}
              >
                Currently available
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
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
                SPOTS USING CATEGORIES
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
                Categorized hidden spots
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          SEARCH
      ======================================================= */}

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            <div className="col-12 col-lg-8">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  ⌕
                </span>

                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search categories..."
                  aria-label="Search categories"
                />
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <select
                className="form-select"
                defaultValue="ALL"
                aria-label="Filter categories"
              >
                <option value="ALL">All categories</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          CATEGORIES TABLE
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
              Categories
            </h5>

            <p
              className="mb-0"
              style={{
                color: "#8a989a",
                fontSize: "12px",
              }}
            >
              Manage the categories used to organize hidden spots.
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
                    DESCRIPTION
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
                    SPOTS
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
                    No category data loaded yet.
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

export default AdminCategories;