import React from "react";

// ===== ADMIN STAT CARD =====
const AdminStatCard = ({ title, value = 0, color, description }) => {
  return (
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
            {title}
          </div>

          <div
            className="fw-bold"
            style={{
              color: color || "#1d2b2e",
              fontSize: "26px",
            }}
          >
            {value ?? 0}
          </div>

          <div
            className="mt-1"
            style={{ color: "#9aa6a8", fontSize: "10px" }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatCard;