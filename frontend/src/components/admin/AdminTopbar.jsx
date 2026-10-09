// ============================================================
// IMPORTS
// ============================================================

import { useAuth } from "../../context/AuthContext";

// ============================================================
// ADMIN TOPBAR
// ============================================================

function AdminTopbar() {
  const { user, logout } = useAuth();

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <header
      className="bg-white border-bottom d-flex align-items-center justify-content-between px-3 px-md-4 flex-shrink-0"
      style={{
        height: "72px",
      }}
    >
      {/* ======================================================
          PAGE TITLE
      ======================================================= */}

      <div>
        <div
          className="fw-semibold"
          style={{
            color: "#1d2b2e",
            fontSize: "18px",
          }}
        >
          Admin Dashboard
        </div>

        <div
          className="d-none d-sm-block mt-1"
          style={{
            color: "#8a989a",
            fontSize: "11px",
          }}
        >
          Manage and monitor NearSpot
        </div>
      </div>

      {/* ======================================================
          ADMIN PROFILE
      ======================================================= */}

      <div className="d-flex align-items-center gap-3">
        {/* ----------------------------------------------------
            STATUS
        ----------------------------------------------------- */}

        <div
          className="d-none d-md-flex align-items-center gap-2 px-3 py-2 rounded-pill"
          style={{
            backgroundColor: "#f0fbf8",
            color: "#247b69",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          <span
            className="rounded-circle"
            style={{
              width: "7px",
              height: "7px",
              backgroundColor: "#20d9ae",
            }}
          />

          Admin
        </div>

        {/* ----------------------------------------------------
            PROFILE
        ----------------------------------------------------- */}

        <div className="dropdown">
          <button
            type="button"
            className="btn border-0 d-flex align-items-center gap-2 p-1"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-semibold"
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: "#20d9ae",
                fontSize: "14px",
              }}
            >
              {user?.email?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="d-none d-md-block text-start">
              <div
                className="fw-semibold"
                style={{
                  color: "#26373a",
                  fontSize: "12px",
                }}
              >
                {user?.email || "Administrator"}
              </div>

              <div
                style={{
                  color: "#899597",
                  fontSize: "10px",
                }}
              >
                Administrator
              </div>
            </div>

            <span
              className="d-none d-md-inline ms-1"
              style={{
                color: "#879496",
                fontSize: "11px",
              }}
            >
              ▾
            </span>
          </button>

          {/* ==================================================
              DROPDOWN
          =================================================== */}

          <ul className="dropdown-menu dropdown-menu-end border-0 shadow rounded-3 mt-2">
            <li>
              <div
                className="px-3 py-2"
                style={{
                  minWidth: "220px",
                }}
              >
                <div
                  className="fw-semibold"
                  style={{
                    color: "#26373a",
                    fontSize: "12px",
                  }}
                >
                  {user?.email || "Administrator"}
                </div>

                <div
                  className="mt-1"
                  style={{
                    color: "#8a989a",
                    fontSize: "10px",
                  }}
                >
                  ADMIN
                </div>
              </div>
            </li>

            <li>
              <hr className="dropdown-divider" />
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2"
                onClick={handleLogout}
                style={{
                  fontSize: "12px",
                  color: "#b42335",
                }}
              >
                <span>↪</span>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminTopbar;