// ============================================================
// IMPORTS
// ============================================================

import PlaceSearch from "../location/PlaceSearch";

// ============================================================
// TOP NAVIGATION
// ============================================================

function TopNavigation({ onLocationSelect }) {
  return (
    <div
      className="position-absolute top-0 start-0 end-0 d-flex align-items-center gap-2 p-3 pe-none"
      style={{
        zIndex: 10000,
      }}
    >
      {/* ======================================================
          LOGO
      ======================================================= */}

      <div
        className="bg-white border rounded-4 shadow-sm d-flex align-items-center gap-2 px-3 flex-shrink-0 pe-auto"
        style={{
          height: "54px",
        }}
      >
        {/* Logo Icon */}

        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
          style={{
            width: "28px",
            height: "28px",
            backgroundColor: "#20d9ae",
            fontSize: "14px",
          }}
        >
          N
        </div>

        {/* Logo Text */}

        <div className="d-none d-md-block">
          <div
            className="fw-bold lh-1"
            style={{
              color: "#162326",
              fontSize: "16px",
            }}
          >
            Near<span style={{ color: "#12cfa4" }}>Spot</span>
          </div>

          <div
            className="mt-1"
            style={{
              color: "#7c8b8e",
              fontSize: "9px",
            }}
          >
            Discover hidden places
          </div>
        </div>
      </div>

      {/* ======================================================
          SEARCH
      ======================================================= */}

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
          <PlaceSearch
            onLocationSelect={onLocationSelect}
          />
        </div>
      </div>

      {/* ======================================================
          LOCATION STATUS
      ======================================================= */}

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

        <span>
          Location enabled
        </span>
      </div>

      {/* ======================================================
          PROFILE
      ======================================================= */}

      <button
        type="button"
        className="btn bg-white border rounded-4 shadow-sm d-flex align-items-center justify-content-center flex-shrink-0 pe-auto p-0"
        style={{
          width: "54px",
          height: "54px",
          color: "#455558",
          fontSize: "19px",
        }}
        aria-label="Profile"
        title="Profile"
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