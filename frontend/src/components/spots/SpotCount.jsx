// ============================================================
// SPOT COUNT COMPONENT
// ============================================================

function SpotCount({ count }) {
  return (
    <div
      className="position-absolute start-50 bottom-0 translate-middle-x bg-white border rounded-pill shadow d-flex align-items-center gap-2 px-3 py-2"
      style={{
        bottom: "20px",
        zIndex: 1000,
        whiteSpace: "nowrap",
      }}
    >
      {/* ==================================================
          COUNT
      ================================================== */}

      <span
        className="fw-bold"
        style={{
          color: "#0fcda4",
          fontSize: "14px",
        }}
      >
        {count}
      </span>

      {/* ==================================================
          LABEL
      ================================================== */}

      <span
        className="fw-medium"
        style={{
          color: "#59696c",
          fontSize: "11px",
        }}
      >
        hidden spots nearby
      </span>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default SpotCount;