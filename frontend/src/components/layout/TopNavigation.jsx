
 // ============================================================
 // IMPORTS
 // ============================================================

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import PlaceSearch from "../location/PlaceSearch";
import NotificationBell from "../common/NotificationBell";

// ============================================================
// TOP NAVIGATION COMPONENT
// ============================================================

function TopNavigation({ onLocationSelect }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // ============================================================
  // HANDLE PROFILE CLICK
  // ============================================================

  const handleProfileClick = () => {
    navigate("/login");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="position-absolute top-0 start-0 end-0 d-flex align-items-center gap-2 p-3 pe-none"
      style={{
        zIndex: 10000,
      }}
    >
      {/* ==================================================
          LOGO
      ================================================== */}

      <div
        className="bg-white border rounded-4 shadow-sm d-flex align-items-center justify-content-center px-3 flex-shrink-0 pe-auto"
        style={{
          height: "54px",
          minWidth: "54px",
        }}
      >
        <img
          src="/logo.png"
          alt="NearSpot"
          style={{
            display: "block",
            width: "auto",
            height: "auto",
            maxWidth: "160px",
            maxHeight: "42px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* ==================================================
          SEARCH
      ================================================== */}

      <div
        className="bg-white border rounded-4 shadow-sm d-flex align-items-center px-3 flex-grow-1 pe-auto"
        style={{
          height: "54px",
          maxWidth: "560px",
          minWidth: 0,
        }}
      >
        <span
          className="flex-shrink-0 me-2"
          style={{
            color: "#16cda5",
            fontSize: "21px",
            lineHeight: 1,
          }}
        >
          ⌕
        </span>

        <div
          className="flex-grow-1"
          style={{
            minWidth: 0,
          }}
        >
          <PlaceSearch onLocationSelect={onLocationSelect} />
        </div>
      </div>

      {/* ==================================================
          LOCATION STATUS
      ================================================== */}

      <div
        className="d-none d-lg-flex align-items-center gap-2 bg-white border rounded-4 shadow-sm px-3 ms-auto flex-shrink-0 pe-auto"
        style={{
          height: "54px",
          color: "#1f3c37",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        <span
          className="rounded-circle flex-shrink-0"
          style={{
            width: "8px",
            height: "8px",
            backgroundColor: "#20d9ae",
            boxShadow: "0 0 0 4px rgba(32, 217, 174, 0.15)",
          }}
        />

        Location active
      </div>

      {/* ==================================================
          NOTIFICATION BELL
      ================================================== */}

      {isAuthenticated && (
        <div className="pe-auto flex-shrink-0">
          <NotificationBell />
        </div>
      )}

      {/* ==================================================
          PROFILE / LOGIN
      ================================================== */}

      <button
        type="button"
        className="btn bg-white border rounded-4 shadow-sm d-flex align-items-center justify-content-center flex-shrink-0 pe-auto p-0"
        onClick={handleProfileClick}
        style={{
          width: "54px",
          height: "54px",
          color: "#455558",
          fontSize: "19px",
        }}
        aria-label="Login"
        title="Login"
      >
        ◉
      </button>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default TopNavigation;
