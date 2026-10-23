
import { useState } from "react";
import PropTypes from "prop-types";

const ICONS = {
  car: "bi-car-front",
  bike: "bi-bicycle",
  footprints: "bi-person-walking",
};

export default function TravelModeSelector({
  modes,
  selectedMode,
  onChange,
  disabled = false,
}) {
  return (
    <div
      className="d-flex align-items-center gap-2"
      role="group"
      aria-label="Travel mode"
    >
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            className={`btn btn-sm ${
              isSelected
                ? "btn-primary"
                : "btn-outline-secondary"
            }`}
            onClick={() => onChange(mode.id)}
            disabled={disabled}
            aria-pressed={isSelected}
          >
            <i
              className={`bi ${
                ICONS[mode.icon] || "bi-geo-alt"
              } me-1`}
              aria-hidden="true"
            />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

TravelModeSelector.propTypes = {
  modes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedMode: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
