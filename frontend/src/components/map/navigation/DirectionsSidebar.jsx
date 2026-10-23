import TravelModeSelector from "./TravelModeSelector";
import TurnInstructions from "./TurnInstructions";

/** Directions content for the separate panel beside NearSpot's collapsed icon rail. */
export default function DirectionsSidebar({
  modes = [],
  selectedMode = "driving",
  onModeChange,
  route = null,
  routeLoading = false,
  modesLoading = false,
  onClearRoute,
  isNavigating = false,
  isTracking = false,
  liveLocation = null,
  locationError = "",
  onStartNavigation,
  onStopNavigation,
  navigation = null,
  destinationName = "Selected destination",
}) {
  if (!route && !routeLoading) return null;

  const summary = route?.features?.[0]?.properties?.summary;
  const distance = summary?.distance;
  const duration = summary?.duration;
  const distanceText = distance != null && Number.isFinite(Number(distance))
    ? `${(Number(distance) / 1000).toFixed(1)} km`
    : "-- km";
  const durationText = duration != null && Number.isFinite(Number(duration))
    ? `${Math.round(Number(duration) / 60)} min`
    : "-- min";

  return (
    <aside
      className="d-flex flex-column w-100 h-100 bg-white"
      style={{ minHeight: 0, overflow: "hidden" }}
      aria-label="Directions panel"
    >
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-bottom">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold mb-0">Directions</h5>
          <button
            type="button"
            className="btn btn-light btn-sm rounded-circle"
            onClick={onClearRoute}
            aria-label="Close directions"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="d-flex flex-column gap-2 mb-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-circle text-primary" aria-hidden="true" />
            <div className="form-control bg-light small text-truncate" title="Your location">
              Your location
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-geo-alt-fill text-danger" aria-hidden="true" />
            <div className="form-control bg-light small text-truncate" title={destinationName}>
              {destinationName}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto px-3 py-3" style={{ minHeight: 0 }}>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <TravelModeSelector
            modes={modes}
            selectedMode={selectedMode}
            onChange={onModeChange}
            disabled={routeLoading || modesLoading}
          />
        </div>
        <div className="border rounded-4 p-3 mb-3">
          <div className="small fw-semibold text-secondary mb-2">Recommended route</div>
          {routeLoading ? (
            <div className="small text-secondary" role="status">
              <span className="spinner-border spinner-border-sm me-2" />
              Calculating route...
            </div>
          ) : (
            <div className="border-start border-primary border-3 ps-3">
              <strong className="fs-5 text-primary">{durationText}</strong>
              <div className="small text-secondary">{distanceText}</div>
            </div>
          )}
        </div>
        {isNavigating && route && <TurnInstructions navigation={navigation} />}
        {isNavigating && (
          <div className="small text-secondary mt-3">
            <i className="bi bi-geo-alt-fill me-2" />
            {isTracking ? "Live GPS tracking" : "Waiting for GPS"}
            {liveLocation?.accuracy != null && Number.isFinite(Number(liveLocation.accuracy)) && (
              <div>Accuracy: {Number(liveLocation.accuracy).toFixed(1)} m</div>
            )}
            {locationError && <div className="alert alert-warning mt-2">{locationError}</div>}
          </div>
        )}
      </div>

      {route && !routeLoading && (
        <div className="flex-shrink-0 p-3 border-top">
          <button
            type="button"
            className={`btn w-100 ${isNavigating ? "btn-outline-danger" : "btn-success"}`}
            onClick={isNavigating ? onStopNavigation : onStartNavigation}
          >
            <i className={`bi ${isNavigating ? "bi-stop-fill" : "bi-play-fill"} me-2`} />
            {isNavigating ? "Stop Navigation" : "Start Navigation"}
          </button>
        </div>
      )}
    </aside>
  );
}
