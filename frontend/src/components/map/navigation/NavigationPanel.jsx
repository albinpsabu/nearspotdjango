
import TravelModeSelector from "./TravelModeSelector";
import TurnInstructions from "./TurnInstructions";

/**
 * Displays route information, travel modes,
 * turn-by-turn instructions, and live navigation controls.
 *
 * All navigation state is managed by NearSpotMap.
 */
export default function NavigationPanel({
  modes = [],
  selectedMode = "driving",
  onModeChange,
  route = null,
  routeLoading = false,
  modesLoading = false,
  onClearRoute,

  // Turn-by-turn navigation
  navigation = null,

  // Live navigation props
  isNavigating = false,
  isTracking = false,
  liveLocation = null,
  locationError = "",
  onStartNavigation,
  onStopNavigation,
}) {
  const routeSummary =
    route?.features?.[0]?.properties?.summary;

  if (!route && !routeLoading) {
    return null;
  }

  const distance = Number(routeSummary?.distance);
  const duration = Number(routeSummary?.duration);

  const distanceText = Number.isFinite(distance)
    ? `${(distance / 1000).toFixed(2)} km`
    : "-- km";

  const durationText = Number.isFinite(duration)
    ? `${(duration / 60).toFixed(1)} min`
    : "-- min";

  const latitude = Number(liveLocation?.latitude);
  const longitude = Number(liveLocation?.longitude);

  const hasCoordinates =
    liveLocation != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <div
      className="position-absolute bottom-0 start-50 translate-middle-x mb-4 bg-white shadow-lg rounded-4 p-3"
      style={{
        zIndex: 1100,
        width: "min(420px, calc(100% - 24px))",
        maxHeight: "min(75vh, 650px)",
        overflowY: "auto",
      }}
      role="region"
      aria-label="Navigation directions"
    >
      {/* HEADER */}

      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold mb-0">
          <i className="bi bi-sign-turn-right me-2 text-primary" />
          {isNavigating ? "Live Navigation" : "Directions"}
        </h6>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-pill"
          onClick={onClearRoute}
        >
          Clear Route
        </button>
      </div>

      {/* TRAVEL MODES */}

      <TravelModeSelector
        modes={modes}
        selectedMode={selectedMode}
        onChange={onModeChange}
        disabled={routeLoading || modesLoading}
      />

      {/* ROUTE DETAILS */}

      <div className="border-top mt-3 pt-3">
        {routeLoading ? (
          <div
            className="d-flex align-items-center gap-2 text-secondary"
            role="status"
          >
            <span
              className="spinner-border spinner-border-sm"
              aria-hidden="true"
            />

            <span className="small">
              Calculating your route...
            </span>
          </div>
        ) : (
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <div className="fw-bold fs-5 text-primary">
                {distanceText}
              </div>

              <div className="small text-secondary">
                Estimated travel distance
              </div>
            </div>

            <div className="text-end">
              <div className="fw-semibold fs-5">
                {durationText}
              </div>

              <div className="small text-secondary">
                Estimated duration
              </div>
            </div>
          </div>
        )}
      </div>

      {/* START / STOP NAVIGATION */}

      {route && !routeLoading && (
        <div className="mt-3">
          {!isNavigating ? (
            <button
              type="button"
              className="btn btn-success w-100 fw-semibold"
              onClick={onStartNavigation}
              disabled={!onStartNavigation}
            >
              <i className="bi bi-play-fill me-2" />
              Start Navigation
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline-danger w-100 fw-semibold"
              onClick={onStopNavigation}
              disabled={!onStopNavigation}
            >
              <i className="bi bi-stop-fill me-2" />
              Stop Navigation
            </button>
          )}
        </div>
      )}

      {/* TURN-BY-TURN NAVIGATION */}

      {isNavigating && route && (
        <TurnInstructions navigation={navigation} />
      )}

      {/* LIVE GPS STATUS */}

      {isNavigating && (
        <div className="border rounded-3 p-3 mt-3 bg-light">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-semibold">
              <i className="bi bi-geo-alt-fill text-success me-2" />
              Live GPS
            </span>

            <span
              className={`badge ${
                isTracking
                  ? "bg-success"
                  : "bg-warning text-dark"
              }`}
            >
              {isTracking ? "Tracking" : "Waiting"}
            </span>
          </div>

          {hasCoordinates ? (
            <div className="small">
              <div className="mb-1">
                <strong>Latitude:</strong>{" "}
                {latitude.toFixed(6)}
              </div>

              <div className="mb-1">
                <strong>Longitude:</strong>{" "}
                {longitude.toFixed(6)}
              </div>

              {Number.isFinite(liveLocation?.accuracy) && (
                <div className="mb-1">
                  <strong>Accuracy:</strong>{" "}
                  {liveLocation.accuracy.toFixed(1)} m
                </div>
              )}

              {liveLocation?.timestamp && (
                <div className="text-secondary mt-2">
                  Updated:{" "}
                  {new Date(
                    liveLocation.timestamp
                  ).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : (
            <div className="small text-secondary">
              Waiting for GPS coordinates...
            </div>
          )}

          {locationError && (
            <div
              className="alert alert-warning small py-2 mt-3 mb-0"
              role="alert"
            >
              {locationError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
