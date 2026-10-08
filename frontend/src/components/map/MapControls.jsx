// ============================================================
// IMPORTS
// ============================================================

import { useMap } from "react-leaflet";

// ============================================================
// MAP CONTROLS COMPONENT
// ============================================================

function MapControls({ onMyLocation }) {
  const map = useMap();

  // ============================================================
  // ZOOM IN
  // ============================================================

  const handleZoomIn = () => {
    map.zoomIn();
  };

  // ============================================================
  // ZOOM OUT
  // ============================================================

  const handleZoomOut = () => {
    map.zoomOut();
  };

  // ============================================================
  // MY LOCATION
  // ============================================================

  const handleMyLocation = () => {
    if (onMyLocation) {
      onMyLocation();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="position-absolute start-0 top-50 translate-middle-y d-flex flex-column gap-2 ms-3"
      style={{
        zIndex: 1000,
      }}
    >
      {/* ==================================================
          ZOOM IN
      ================================================== */}

      <button
        type="button"
        className="btn btn-light border shadow rounded-4 d-flex align-items-center justify-content-center p-0"
        onClick={handleZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
        style={{
          width: "48px",
          height: "48px",
          color: "#344548",
          fontSize: "19px",
          fontWeight: 500,
        }}
      >
        +
      </button>

      {/* ==================================================
          ZOOM OUT
      ================================================== */}

      <button
        type="button"
        className="btn btn-light border shadow rounded-4 d-flex align-items-center justify-content-center p-0"
        onClick={handleZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
        style={{
          width: "48px",
          height: "48px",
          color: "#344548",
          fontSize: "19px",
          fontWeight: 500,
        }}
      >
        −
      </button>

      {/* ==================================================
          MY LOCATION
      ================================================== */}

      <button
        type="button"
        className="btn btn-light border shadow rounded-4 d-flex align-items-center justify-content-center p-0"
        onClick={handleMyLocation}
        aria-label="My location"
        title="My location"
        style={{
          width: "48px",
          height: "48px",
          color: "#344548",
          fontSize: "19px",
          fontWeight: 500,
        }}
      >
        ◎
      </button>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default MapControls;