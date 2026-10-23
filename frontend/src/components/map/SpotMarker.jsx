
import { Marker, Popup } from "react-leaflet";

// ============================================================
// MEDIA URL HELPER
// ============================================================

// Convert relative Django media paths into absolute URLs.
function getMediaUrl(file) {
  if (!file || typeof file !== "string") {
    return null;
  }

  // Django may already return a complete URL.
  if (
    file.startsWith("http://") ||
    file.startsWith("https://")
  ) {
    return file;
  }

  const apiBase =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api";

  const backendOrigin = new URL(
    apiBase,
    window.location.origin
  ).origin;

  return new URL(file, `${backendOrigin}/`).href;
}

// ============================================================
// HIDDENSPOT MARKER
// ============================================================

// NEW PROPS:
// onGetDirections: Callback provided by NearSpotMap.
// routeLoading: Whether the routing API is processing a request.
function SpotMarker({
  spot,
  onGetDirections,
  routeLoading = false,
}) {
  // ==========================================================
  // COORDINATE VALIDATION
  // ==========================================================

  if (
    spot.latitude === null ||
    spot.longitude === null ||
    spot.latitude === undefined ||
    spot.longitude === undefined
  ) {
    return null;
  }

  const latitude = Number(spot.latitude);
  const longitude = Number(spot.longitude);

  const position = [latitude, longitude];

  if (
    !position.every(Number.isFinite) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  // ==========================================================
  // DISTANCE
  // ==========================================================

  const distance =
    spot.distance_meters !== undefined &&
    spot.distance_meters !== null
      ? spot.distance_meters < 1000
        ? `${Math.round(spot.distance_meters)} m away`
        : `${(spot.distance_meters / 1000).toFixed(1)} km away`
      : "";

  // ==========================================================
  // MEDIA
  // ==========================================================

  // Django's ApprovedSpotSerializer returns media as:
  // [{ id, media_type, url, uploaded_at }]

  const mediaItems = Array.isArray(spot.media)
    ? spot.media
    : Array.isArray(spot.media_files)
    ? spot.media_files
    : [];

  // Extract image URLs from the media collection.
  const images = mediaItems
    .filter(
      (item) =>
        item.media_type?.toUpperCase() === "IMAGE"
    )
    .map((item) => ({
      id: item.id,
      url: getMediaUrl(
        item.url || item.file || item.file_url
      ),
    }))
    .filter((item) => item.url);

  // ==========================================================
  // DIRECTIONS HANDLER
  // ==========================================================

  function handleDirectionsClick() {
    // The actual API request is handled by NearSpotMap.
    // SpotMarker only supplies the destination coordinates.
    onGetDirections?.({
      latitude,
      longitude,
    });
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Marker position={position}>
      <Popup minWidth={250} maxWidth={320}>
        <div
          style={{
            width: "100%",
            minWidth: "230px",
          }}
        >
          {/* SPOT NAME */}
          <h6 className="fw-bold mb-2">
            {spot.name}
          </h6>

          {/* UPLOADED IMAGES */}
          {images.length > 0 && (
            <div className="mb-3">
              <img
                src={images[0].url}
                alt={spot.name}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "170px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  display: "block",
                }}
              />

              {images.length > 1 && (
                <small className="text-secondary d-block mt-1">
                  +{images.length - 1} more photo(s)
                </small>
              )}
            </div>
          )}

          {/* DESCRIPTION */}
          {spot.description && (
            <p className="small text-secondary mb-2">
              {spot.description}
            </p>
          )}

          {/* DISTANCE */}
          {distance && (
            <p className="small text-success fw-semibold mb-2">
              {distance}
            </p>
          )}

          {/* STATUS */}
          {spot.status && (
            <small className="text-secondary d-block mb-3">
              Status: {spot.status}
            </small>
          )}

          {/* ================================================
              NEW: DIRECTIONS BUTTON
              ================================================ */}

          <button
            type="button"
            className="btn btn-success w-100 mt-2"
            onClick={handleDirectionsClick}
            disabled={
              routeLoading ||
              typeof onGetDirections !== "function"
            }
          >
            {routeLoading
              ? "Calculating route..."
              : "↗ Get Directions"}
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default SpotMarker;
