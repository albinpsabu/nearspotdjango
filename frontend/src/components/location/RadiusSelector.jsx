
import { useState } from "react";

function RadiusSelector({ radius, onRadiusChange }) {
  const [unit, setUnit] = useState("km");
  const [inputValue, setInputValue] = useState(
    String(radius / 1000)
  );
  const [error, setError] = useState("");

  const radiusOptions = [
    { label: "500 m", value: 500 },
    { label: "1 km", value: 1000 },
    { label: "2 km", value: 2000 },
    { label: "5 km", value: 5000 },
    { label: "10 km", value: 10000 },
    { label: "20 km", value: 20000 },
  ];

  const formatRadius = (value) =>
    value < 1000
      ? `${value} m`
      : `${Number.isInteger(value / 1000)
          ? value / 1000
          : (value / 1000).toFixed(2)} km`;

  const handleApply = () => {
    const enteredValue = Number(inputValue);
    const radiusInMeters =
      unit === "km" ? enteredValue * 1000 : enteredValue;

    if (
      inputValue.trim() === "" ||
      !Number.isFinite(enteredValue) ||
      enteredValue <= 0
    ) {
      setError("Enter a valid radius greater than zero.");
      return;
    }

    if (radiusInMeters > 20000) {
      setError("Maximum radius is 20 km.");
      return;
    }

    onRadiusChange(Math.round(radiusInMeters));
    setInputValue(String(
      unit === "km"
        ? Number((radiusInMeters / 1000).toFixed(3))
        : Math.round(radiusInMeters)
    ));
    setError("");
  };

  const handleUnitChange = (nextUnit) => {
    const currentValue = Number(inputValue);

    if (inputValue.trim() !== "" && Number.isFinite(currentValue)) {
      const meters =
        unit === "km" ? currentValue * 1000 : currentValue;

      setInputValue(
        String(
          nextUnit === "km"
            ? Number((meters / 1000).toFixed(3))
            : Math.round(meters)
        )
      );
    }

    setUnit(nextUnit);
    setError("");
  };

  const selectPreset = (value) => {
    onRadiusChange(value);
    setInputValue(
      String(unit === "km" ? value / 1000 : value)
    );
    setError("");
  };

  return (
    <div className="nearspot-radius-selector">
      <style>{`
        .nearspot-radius-selector .radius-value {
          font-size: 1.6rem;
          font-weight: 750;
          color: #198754;
        }

        .nearspot-radius-selector .radius-presets {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .nearspot-radius-selector .radius-preset {
          padding: 9px 4px;
          border: 1px solid #dce7df;
          border-radius: 10px;
          background: #fff;
          color: #344548;
          font-size: 12px;
          font-weight: 600;
        }

        .nearspot-radius-selector .radius-preset.active {
          background: #198754;
          color: white;
          border-color: #198754;
        }

        .nearspot-radius-selector .radius-help {
          font-size: 11px;
          color: #718078;
        }
      `}</style>

      <div className="mb-3">
        <div className="small text-secondary mb-1">
          Current search radius
        </div>
        <div className="radius-value">
          {formatRadius(radius)}
        </div>
      </div>

      <label className="form-label small fw-semibold">
        Enter your radius
      </label>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleApply();
        }}
      >
        <div className="input-group">
          <input
            type="number"
            className="form-control"
            min="0.001"
            max={unit === "km" ? 20 : 20000}
            step="any"
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              setError("");
            }}
            placeholder="Enter radius"
            aria-label="Enter search radius"
          />

          <select
            className="form-select"
            style={{ maxWidth: "90px" }}
            value={unit}
            onChange={(event) =>
              handleUnitChange(event.target.value)
            }
            aria-label="Radius unit"
          >
            <option value="m">Metres</option>
            <option value="km">Km</option>
          </select>
        </div>

        {error && (
          <div className="small text-danger mt-2" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-success w-100 mt-2 rounded-3"
        >
          Apply Radius
        </button>
      </form>

      <div className="small fw-semibold text-dark mt-4 mb-2">
        Quick select
      </div>

      <div className="radius-presets">
        {radiusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`radius-preset ${
              radius === option.value ? "active" : ""
            }`}
            onClick={() => selectPreset(option.value)}
            aria-pressed={radius === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="radius-help mt-3 mb-0">
        Enter any radius up to 20 km, then select Apply Radius.
      </p>
    </div>
  );
}

export default RadiusSelector;
