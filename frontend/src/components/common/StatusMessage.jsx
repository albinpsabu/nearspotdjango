// ============================================================
// STATUS MESSAGE COMPONENT
// ============================================================

function StatusMessage({
  type,
  message,
  onRetry,
}) {
  // ============================================================
  // ERROR STYLE
  // ============================================================

  const isError = type === "error";

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="position-absolute top-0 start-50 translate-middle-x bg-white border rounded-4 shadow px-3 py-2"
      style={{
        top: "140px",
        zIndex: 1200,
        color: isError ? "#b42335" : "#506164",
        fontSize: "12px",
        whiteSpace: "nowrap",
        maxWidth: "calc(100% - 30px)",
      }}
    >
      {/* ======================================================
          LOADING
      ======================================================= */}

      {type === "loading" && (
        <div className="d-flex align-items-center gap-2">
          <div
            className="spinner-border spinner-border-sm flex-shrink-0"
            role="status"
            style={{
              color: "#16cda5",
            }}
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>

          <span>
            {message}
          </span>
        </div>
      )}

      {/* ======================================================
          ERROR
      ======================================================= */}

      {type === "error" && (
        <div className="d-flex align-items-center gap-3">
          <span>
            {message}
          </span>

          {onRetry && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill flex-shrink-0"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default StatusMessage;