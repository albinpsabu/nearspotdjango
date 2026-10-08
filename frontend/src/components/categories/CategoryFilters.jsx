// ============================================================
// CATEGORY FILTERS COMPONENT
// ============================================================

function CategoryFilters({ categories }) {
  return (
    <div
      className="position-absolute top-0 start-50 translate-middle-x d-flex gap-2 overflow-auto px-1 py-1"
      style={{
        top: "78px",
        maxWidth: "calc(100% - 30px)",
        zIndex: 9000,
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {categories.map((category, index) => {
        const isActive = index === 0;

        return (
          <button
            key={category}
            type="button"
            className="btn btn-sm rounded-pill shadow-sm flex-shrink-0 fw-semibold"
            style={{
              height: "38px",
              padding: "0 17px",
              fontSize: "12px",
              whiteSpace: "nowrap",

              backgroundColor: isActive
                ? "#20d9ae"
                : "rgba(255, 255, 255, 0.96)",

              borderColor: isActive
                ? "#20d9ae"
                : "rgba(20, 40, 45, 0.12)",

              color: isActive
                ? "#06352b"
                : "#465659",
            }}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default CategoryFilters;