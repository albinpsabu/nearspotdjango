
import React from "react";

// ============================================================
// ADMIN STAT CARD
// NearSpot White + Yellow Premium Theme — Style D
// ============================================================

const AdminStatCard = ({
  title,
  value = 0,
  color,
  description,
}) => {
  const theme = {
    surface: "#FFFFFF",
    background: "#FAFAFA",
    accent: "#FFC21A",
    accentSoft: "#FFF5D6",
    text: "#292929",
    secondary: "#777777",
    border: "#E5E5E5",
  };

  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div
        className="card h-100 rounded-4"
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.025)",
          transition:
            "transform 0.2s ease, box-shadow 0.2s ease",
          overflow: "hidden",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-3px)";
          event.currentTarget.style.boxShadow =
            "0 8px 24px rgba(0, 0, 0, 0.07)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0)";
          event.currentTarget.style.boxShadow =
            "0 2px 8px rgba(0, 0, 0, 0.025)";
        }}
      >
        {/* SUBTLE YELLOW BRAND ACCENT */}

        <div
          style={{
            height: "3px",
            width: "100%",
            backgroundColor: theme.accent,
          }}
        />

        <div className="card-body p-4">
          {/* STAT TITLE */}

          <div
            className="mb-3"
            style={{
              color: theme.secondary,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              lineHeight: 1.5,
            }}
          >
            {title}
          </div>

          {/* STAT VALUE */}

          <div
            className="fw-bold"
            style={{
              color: color || theme.text,
              fontSize: "30px",
              lineHeight: 1.2,
              letterSpacing: "-0.8px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value ?? 0}
          </div>

          {/* STAT DESCRIPTION */}

          {description != null && description !== "" && (
            <div
              className="mt-2"
              style={{
                color: theme.secondary,
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStatCard;
