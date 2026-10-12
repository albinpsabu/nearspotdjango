
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

import UserLocationMarker from "./UserLocationMarker";
import SpotMarker from "./SpotMarker";
import MapControls from "./MapControls";
import ExternalPlaceMarker from "./ExternalPlaceMarker";

// ============================================================
// CONFIGURATION
// ============================================================

const EXTERNAL_API = "/spots/external/";
const FETCH_DEBOUNCE_MS = 1200;
const MIN_DISCOVERY_ZOOM = 15;
const MAX_DISCOVERY_AREA_KM2 = 16;
const SERVICE_COOLDOWN_MS = 60_000;
const FAILED_REQUEST_COOLDOWN_MS = 60_000;
const MAX_CACHED_AREAS = 15;
const MAX_FAILED_KEYS = 50;

// Temporary marker for a new HiddenSpot
const newSpotIcon = L.divIcon({
  className: "nearsport-new-spot-marker",
  html: `
    <div style="
      width:42px;
      height:42px;
      border-radius:50% 50% 50% 0;
      background:#10b981;
      border:4px solid white;
      box-shadow:0 4px 14px rgba(0,0,0,.3);
      transform:rotate(-45deg);
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
    ">
      <span style="
        transform:rotate(45deg);
        color:white;
        font-size:22px;
        font-weight:bold;
      ">+</span>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
});

// ============================================================
// HELPERS
// ============================================================

function calculateAreaKm2(bounds) {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  const middleLatitude = (south + north) / 2;
  const heightKm = (north - south) * 111.32;

  const widthKm =
    (east - west) *
    111.32 *
    Math.cos((middleLatitude * Math.PI) / 180);

  return heightKm * widthKm;
}

function getApiError(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.error === "string") {
    return data.error;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const firstError = Object.values(data)[0];

    if (Array.isArray(firstError)) {
      return firstError.join(" ");
    }

    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return fallback;
}

function getPlacePath(place) {
  return (
    `${EXTERNAL_API}` +
    `${encodeURIComponent(place.osm_type)}/` +
    `${encodeURIComponent(place.osm_id)}/`
  );
}

function formatCategory(category) {
  if (!category) return "Place";

  return category
    .split(":")
    .pop()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function getReviewUserId(review) {
  const value =
    review.user_id ??
    review.user?.id ??
    (typeof review.user === "number"
      ? review.user
      : null);

  return value == null ? null : String(value);
}

function getReviewAuthor(review) {
  return (
    review.user_name ||
    review.username ||
    review.user?.name ||
    review.user?.username ||
    review.user?.email ||
    "NearSpot user"
  );
}

function coversViewport(cachedBounds, bounds) {
  return (
    cachedBounds.south <= bounds.south &&
    cachedBounds.west <= bounds.west &&
    cachedBounds.north >= bounds.north &&
    cachedBounds.east >= bounds.east
  );
}

function filterPlaces(places, bounds) {
  return places.filter((place) => {
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);

    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    );
  });
}

// ============================================================
// MAP LOCATION CONTROLLER
// ============================================================

function MapLocationController({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.invalidateSize();

    map.flyTo([latitude, longitude], 15, {
      animate: true,
      duration: 1.2,
    });
  }, [location?.latitude, location?.longitude, map]);

  return null;
}

// ============================================================
// OPTIMIZED EXTERNAL PLACE DISCOVERY
// ============================================================

function ExternalPlaceDiscovery({ onPlacesChange }) {
  const map = useMap();

  const debounceRef = useRef(null);
  const runningRef = useRef(false);
  const pendingRef = useRef(false);

  const cacheRef = useRef([]);
  const failedRequestsRef = useRef(new Map());
  const serviceRetryAfterRef = useRef(0);
  const onPlacesChangeRef = useRef(onPlacesChange);

  useEffect(() => {
    onPlacesChangeRef.current = onPlacesChange;
  }, [onPlacesChange]);

  useEffect(() => {
    let active = true;

    function getViewport() {
      const zoom = map.getZoom();

      if (zoom < MIN_DISCOVERY_ZOOM) {
        return null;
      }

      const mapBounds = map.getBounds();
      const areaKm2 = calculateAreaKm2(mapBounds);

      if (
        !Number.isFinite(areaKm2) ||
        areaKm2 <= 0 ||
        areaKm2 > MAX_DISCOVERY_AREA_KM2
      ) {
        return null;
      }

      const bounds = {
        south: mapBounds.getSouth(),
        west: mapBounds.getWest(),
        north: mapBounds.getNorth(),
        east: mapBounds.getEast(),
      };

      if (
        bounds.west >= bounds.east ||
        bounds.south >= bounds.north
      ) {
        return null;
      }

      return bounds;
    }

    function getRequestKey(bounds) {
      return [
        bounds.south.toFixed(3),
        bounds.west.toFixed(3),
        bounds.north.toFixed(3),
        bounds.east.toFixed(3),
      ].join(":");
    }

    function findCachedArea(bounds) {
      return cacheRef.current.find((entry) =>
        coversViewport(entry.bounds, bounds)
      );
    }

    function storeCachedArea(bounds, places) {
      cacheRef.current = cacheRef.current.filter(
        (entry) =>
          !(
            entry.bounds.south === bounds.south &&
            entry.bounds.west === bounds.west &&
            entry.bounds.north === bounds.north &&
            entry.bounds.east === bounds.east
          )
      );

      cacheRef.current.unshift({
        bounds,
        places,
      });

      cacheRef.current = cacheRef.current.slice(
        0,
        MAX_CACHED_AREAS
      );
    }

    function rememberFailure(requestKey) {
      failedRequestsRef.current.set(
        requestKey,
        Date.now()
      );

      if (
        failedRequestsRef.current.size >
        MAX_FAILED_KEYS
      ) {
        const oldestKey =
          failedRequestsRef.current.keys().next().value;

        failedRequestsRef.current.delete(oldestKey);
      }
    }

    function getServerCooldown(error) {
      const retryAfter =
        error?.response?.headers?.["retry-after"];

      if (!retryAfter) {
        return SERVICE_COOLDOWN_MS;
      }

      const seconds = Number(retryAfter);

      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.max(
          SERVICE_COOLDOWN_MS,
          seconds * 1000
        );
      }

      const retryDate = Date.parse(retryAfter);

      if (Number.isFinite(retryDate)) {
        return Math.max(
          SERVICE_COOLDOWN_MS,
          retryDate - Date.now()
        );
      }

      return SERVICE_COOLDOWN_MS;
    }

    async function fetchPlaces() {
      if (!active) return;

      // Prevent overlapping requests
      if (runningRef.current) {
        pendingRef.current = true;
        return;
      }

      const bounds = getViewport();

      if (!bounds) return;

      // Serve cached places first
      const cachedArea = findCachedArea(bounds);

      if (cachedArea) {
        onPlacesChangeRef.current(
          filterPlaces(cachedArea.places, bounds)
        );
        return;
      }

      // Respect service cooldown
      if (Date.now() < serviceRetryAfterRef.current) {
        return;
      }

      const requestKey = getRequestKey(bounds);
      const lastFailure =
        failedRequestsRef.current.get(requestKey);

      if (
        lastFailure &&
        Date.now() - lastFailure <
          FAILED_REQUEST_COOLDOWN_MS
      ) {
        return;
      }

      runningRef.current = true;

      try {
        const response = await api.get(
          `${EXTERNAL_API}nearby/`,
          { params: bounds }
        );

        if (!active) return;

        const places = Array.isArray(
          response.data?.places
        )
          ? response.data.places
          : [];

        storeCachedArea(bounds, places);
        failedRequestsRef.current.delete(requestKey);
        serviceRetryAfterRef.current = 0;

        if (!pendingRef.current) {
          onPlacesChangeRef.current(
            filterPlaces(places, bounds)
          );
        }
      } catch (error) {
        if (!active) return;

        if (
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError"
        ) {
          return;
        }

        const status = error?.response?.status;

        rememberFailure(requestKey);

        if (status === 503 || status === 429) {
          const cooldown = getServerCooldown(error);

          serviceRetryAfterRef.current =
            Date.now() + cooldown;

          pendingRef.current = false;

          console.warn(
            "NearSpot discovery temporarily unavailable. " +
            `Requests paused for ${Math.ceil(
              cooldown / 1000
            )} seconds.`
          );

          return;
        }

        if (
          !error?.response &&
          (error?.code === "ERR_NETWORK" ||
            error?.code === "ECONNABORTED")
        ) {
          serviceRetryAfterRef.current =
            Date.now() + SERVICE_COOLDOWN_MS;

          pendingRef.current = false;

          console.warn(
            "NearSpot discovery network unavailable. " +
            "Requests paused for 60 seconds."
          );

          return;
        }

        console.warn(
          "External place discovery:",
          getApiError(
            error,
            "Unable to load nearby places."
          )
        );
      } finally {
        runningRef.current = false;

        if (active && pendingRef.current) {
          pendingRef.current = false;
          scheduleFetch();
        }
      }
    }

    function scheduleFetch() {
      if (!active) return;

      clearTimeout(debounceRef.current);

      if (Date.now() < serviceRetryAfterRef.current) {
        return;
      }

      if (runningRef.current) {
        pendingRef.current = true;
        return;
      }

      debounceRef.current = setTimeout(
        fetchPlaces,
        FETCH_DEBOUNCE_MS
      );
    }

    scheduleFetch();

    map.on("moveend", scheduleFetch);

    return () => {
      active = false;
      map.off("moveend", scheduleFetch);
      clearTimeout(debounceRef.current);
    };
  }, [map]);

  return null;
}

// ============================================================
// MAP CLICK HANDLER
// ============================================================

function MapClickHandler({
  onClose,
  isSelectingSpot = false,
  onSpotLocationSelect,
}) {
  useMapEvents({
    click(event) {
      const target = event.originalEvent?.target;

      // Don't select a location by clicking an existing marker
      if (
        target?.closest?.(
          ".nearsport-external-marker, .leaflet-marker-icon"
        )
      ) {
        return;
      }

      if (isSelectingSpot) {
        onSpotLocationSelect?.({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });

        return;
      }

      // Normal behavior: close selected place details
      onClose();
    },
  });

  return null;
}

// ============================================================
// SELECTED EXTERNAL PLACE CARD
// ============================================================

function SelectedExternalPlaceCard({ place, onClose }) {
  const { user, isAuthenticated } = useAuth();

  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] =
    useState(true);
  const [detailsError, setDetailsError] = useState("");

  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [editingReview, setEditingReview] =
    useState(false);

  const [submittingReview, setSubmittingReview] =
    useState(false);

  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const placePath = getPlacePath(place);

  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  const directionsUrl =
    "https://www.google.com/maps/dir/?api=1" +
    `&destination=${encodeURIComponent(
      `${latitude},${longitude}`
    )}`;

  const reviews = Array.isArray(details?.reviews)
    ? details.reviews
    : [];

  const userId =
    user?.id == null ? null : String(user.id);

  const myReview =
    userId === null
      ? null
      : reviews.find(
          (review) =>
            getReviewUserId(review) === userId
        ) || null;

  const averageRating = details?.average_rating;
  const reviewCount = details?.review_count ?? 0;

  // ----------------------------------------------------------
  // LOAD PLACE DETAILS
  // ----------------------------------------------------------

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadDetails() {
      setDetails(null);
      setIsSaved(false);
      setLoadingDetails(true);
      setDetailsError("");
      setActionError("");
      setActionMessage("");
      setEditingReview(false);
      setRating(5);
      setComment("");

      try {
        const response = await api.get(placePath, {
          signal: controller.signal,
        });

        if (!active) return;

        setDetails(response.data);
        setIsSaved(Boolean(response.data.is_saved));
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        if (error.response?.status === 404) {
          setDetails(null);
          setIsSaved(false);
        } else {
          setDetailsError(
            getApiError(
              error,
              "Could not load place details."
            )
          );
        }
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    }

    loadDetails();

    return () => {
      active = false;
      controller.abort();
    };
  }, [placePath, isAuthenticated]);

  // Close details on Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  async function refreshDetails() {
    const response = await api.get(placePath);

    setDetails(response.data);
    setIsSaved(Boolean(response.data.is_saved));

    return response.data;
  }

  // ----------------------------------------------------------
  // SAVE / UNSAVE
  // ----------------------------------------------------------

  async function handleSaveToggle() {
    if (!isAuthenticated || saving) return;

    setSaving(true);
    setActionError("");
    setActionMessage("");

    try {
      if (isSaved) {
        await api.delete(`${placePath}save/`);

        setIsSaved(false);
        setActionMessage(
          "Place removed from saved places."
        );
      } else {
        await api.post(`${placePath}save/`);

        setIsSaved(true);
        setActionMessage(
          "Place saved successfully."
        );
      }

      await refreshDetails();
    } catch (error) {
      setActionError(
        getApiError(
          error,
          "Could not update your saved places."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // ----------------------------------------------------------
  // SUBMIT / UPDATE REVIEW
  // ----------------------------------------------------------

  async function handleReviewSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated || submittingReview) {
      return;
    }

    setSubmittingReview(true);
    setActionError("");
    setActionMessage("");

    const payload = {
      rating: Number(rating),
      comment: comment.trim(),
    };

    try {
      if (editingReview && myReview) {
        await api.patch(
          `${placePath}review/`,
          payload
        );

        setActionMessage(
          "Review updated successfully."
        );
      } else {
        await api.post(
          `${placePath}review/`,
          payload
        );

        setActionMessage(
          "Review submitted successfully."
        );
      }

      await refreshDetails();

      setEditingReview(false);
      setRating(5);
      setComment("");
    } catch (error) {
      console.error(
        "Review submission failed:",
        error.response?.data || error.message
      );

      setActionError(
        getApiError(
          error,
          "Could not submit your review."
        )
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // ----------------------------------------------------------
  // EDIT REVIEW
  // ----------------------------------------------------------

  function handleEditReview() {
    if (!myReview) return;

    setRating(Number(myReview.rating) || 5);
    setComment(myReview.comment || "");
    setEditingReview(true);

    setActionError("");
    setActionMessage("");
  }

  // ----------------------------------------------------------
  // DELETE REVIEW
  // ----------------------------------------------------------

  async function handleDeleteReview() {
    if (!myReview || submittingReview) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your review?"
    );

    if (!confirmed) return;

    setSubmittingReview(true);
    setActionError("");
    setActionMessage("");

    try {
      await api.delete(`${placePath}review/`);

      await refreshDetails();

      setEditingReview(false);
      setRating(5);
      setComment("");

      setActionMessage(
        "Review deleted successfully."
      );
    } catch (error) {
      setActionError(
        getApiError(
          error,
          "Could not delete your review."
        )
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // ----------------------------------------------------------
  // PLACE DETAILS UI
  // ----------------------------------------------------------

  return (
    <aside
      className="nearsport-place-card"
      aria-label="Selected place details"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="nearsport-place-card-close"
        onClick={onClose}
        aria-label="Close place details"
      >
        ×
      </button>

      <div className="nearsport-place-card-content">
        <span className="nearsport-place-card-label">
          OpenStreetMap place
        </span>

        <h2>{details?.name || place.name}</h2>

        <p className="nearsport-place-card-category">
          {formatCategory(
            details?.category || place.category
          )}
        </p>

        <p className="nearsport-place-card-rating">
          {loadingDetails
            ? "Loading NearSpot ratings..."
            : averageRating != null
            ? `★ ${averageRating} / 5 (${reviewCount} reviews)`
            : "☆ No NearSpot ratings yet"}
        </p>

        {(details?.address || place.address) && (
          <p className="nearsport-place-card-address">
            📍 {details?.address || place.address}
          </p>
        )}

        <div className="nearsport-place-card-actions">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nearsport-place-card-directions"
          >
            ↗ Directions
          </a>

          {isAuthenticated && (
            <button
              type="button"
              className={
                "nearsport-place-card-save" +
                (isSaved ? " is-saved" : "")
              }
              onClick={handleSaveToggle}
              disabled={saving || loadingDetails}
            >
              {saving
                ? "Please wait..."
                : isSaved
                ? "♥ Saved"
                : "♡ Save"}
            </button>
          )}
        </div>

        {!isAuthenticated && (
          <p className="nearsport-place-card-login">
            Log in to save this place or write a review.
          </p>
        )}

        {detailsError && (
          <p
            className="nearsport-place-card-error"
            role="alert"
          >
            {detailsError}
          </p>
        )}

        {actionError && (
          <p
            className="nearsport-place-card-error"
            role="alert"
          >
            {actionError}
          </p>
        )}

        {actionMessage && (
          <p
            className="nearsport-place-card-success"
            role="status"
          >
            {actionMessage}
          </p>
        )}

        <div className="nearsport-place-card-reviews">
          <h3>Reviews ({reviewCount})</h3>

          {loadingDetails ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p>
              No reviews yet. Be the first to review
              this place!
            </p>
          ) : (
            <div className="nearsport-review-list">
              {reviews.map((review, index) => (
                <div
                  key={review.id ?? index}
                  className="nearsport-review-item"
                >
                  <div className="nearsport-review-heading">
                    <strong>
                      {getReviewAuthor(review)}
                    </strong>

                    <span>
                      {"★".repeat(
                        Math.max(
                          0,
                          Math.min(
                            5,
                            Number(review.rating) || 0
                          )
                        )
                      )}
                    </span>
                  </div>

                  {review.comment && (
                    <p>{review.comment}</p>
                  )}

                  {review.created_at && (
                    <small>
                      {new Date(
                        review.created_at
                      ).toLocaleDateString()}
                    </small>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAuthenticated &&
            myReview &&
            !editingReview && (
              <div className="nearsport-review-controls">
                <button
                  type="button"
                  onClick={handleEditReview}
                >
                  Edit my review
                </button>

                <button
                  type="button"
                  onClick={handleDeleteReview}
                  disabled={submittingReview}
                >
                  Delete
                </button>
              </div>
            )}

          {isAuthenticated &&
            !loadingDetails &&
            (!myReview || editingReview) && (
              <form
                className="nearsport-review-form"
                onSubmit={handleReviewSubmit}
              >
                <h4>
                  {editingReview
                    ? "Edit your review"
                    : "Write a review"}
                </h4>

                <label htmlFor="nearsport-review-rating">
                  Rating
                </label>

                <select
                  id="nearsport-review-rating"
                  value={rating}
                  onChange={(event) =>
                    setRating(Number(event.target.value))
                  }
                  required
                >
                  <option value={5}>★★★★★ — 5</option>
                  <option value={4}>★★★★☆ — 4</option>
                  <option value={3}>★★★☆☆ — 3</option>
                  <option value={2}>★★☆☆☆ — 2</option>
                  <option value={1}>★☆☆☆☆ — 1</option>
                </select>

                <label htmlFor="nearsport-review-comment">
                  Your review
                </label>

                <textarea
                  id="nearsport-review-comment"
                  value={comment}
                  onChange={(event) =>
                    setComment(event.target.value)
                  }
                  placeholder="Share your experience..."
                  rows={4}
                />

                <div className="nearsport-review-form-actions">
                  <button
                    type="submit"
                    disabled={submittingReview}
                  >
                    {submittingReview
                      ? "Submitting..."
                      : editingReview
                      ? "Update review"
                      : "Submit review"}
                  </button>

                  {editingReview && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setEditingReview(false);
                        setRating(5);
                        setComment("");
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
        </div>

        <p className="nearsport-place-card-attribution">
          Place data © OpenStreetMap contributors
        </p>
      </div>
    </aside>
  );
}

// ============================================================
// STYLES
// ============================================================

const mapStyles = `
.nearsport-map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.nearsport-map .leaflet-control-zoom {
  border: none;
  box-shadow: 0 8px 24px rgba(20,40,45,.14);
}

.nearsport-map .leaflet-control-zoom a {
  width: 36px;
  height: 36px;
  line-height: 36px;
  border: none;
  background: rgba(255,255,255,.96);
  color: #263639;
  font-size: 18px;
  font-weight: 700;
}

.nearsport-map .leaflet-control-zoom a:hover {
  background: #f2fbf8;
  color: #10cda4;
}

.nearsport-map .leaflet-control-attribution {
  background: rgba(255,255,255,.82);
  backdrop-filter: blur(8px);
  border-radius: 8px 0 0 0;
  padding: 3px 7px;
  font-size: 9px;
}

.nearsport-place-card {
  position: absolute;
  top: 110px;
  left: 18px;
  width: min(350px, calc(100% - 36px));
  max-height: calc(100% - 130px);
  overflow-y: auto;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 12px 45px rgba(0,0,0,.18);
  z-index: 1000;
  color: #263639;
}

.nearsport-place-card-content {
  padding: 24px;
}

.nearsport-place-card-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #e2e8f0;
  color: #334155;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.nearsport-place-card-close:hover {
  background: #cbd5e1;
}

.nearsport-place-card-label {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #059669;
  margin-bottom: 10px;
}

.nearsport-place-card h2 {
  font-size: 23px;
  line-height: 1.3;
  margin: 0 38px 8px 0;
  font-weight: 700;
}

.nearsport-place-card-category {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 14px;
}

.nearsport-place-card-rating {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px;
}

.nearsport-place-card-address {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 18px;
}

.nearsport-place-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 22px;
}

.nearsport-place-card-directions,
.nearsport-place-card-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.nearsport-place-card-directions {
  background: #059669;
  color: white;
}

.nearsport-place-card-directions:hover {
  background: #047857;
  color: white;
}

.nearsport-place-card-save {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}

.nearsport-place-card-save.is-saved {
  background: #d1fae5;
  border-color: #059669;
}

.nearsport-place-card-save:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.nearsport-place-card-login {
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.nearsport-place-card-error,
.nearsport-place-card-success {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.nearsport-place-card-error {
  color: #b91c1c;
  background: #fef2f2;
}

.nearsport-place-card-success {
  color: #047857;
  background: #ecfdf5;
}

.nearsport-place-card-reviews {
  border-top: 1px solid #e2e8f0;
  padding-top: 18px;
}

.nearsport-place-card-reviews h3 {
  font-size: 16px;
  margin: 0 0 10px;
}

.nearsport-place-card-reviews p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.nearsport-review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.nearsport-review-item {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

.nearsport-review-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.nearsport-review-heading span {
  color: #f59e0b;
  white-space: nowrap;
}

.nearsport-review-item p {
  margin: 8px 0;
  overflow-wrap: anywhere;
}

.nearsport-review-item small {
  color: #94a3b8;
}

.nearsport-review-controls {
  display: flex;
  gap: 10px;
  margin: 12px 0;
}

.nearsport-review-controls button {
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  color: #334155;
}

.nearsport-review-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.nearsport-review-form h4 {
  margin: 0 0 4px;
  font-size: 14px;
}

.nearsport-review-form label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.nearsport-review-form select,
.nearsport-review-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px;
  font: inherit;
  font-size: 13px;
  background: white;
  color: #263639;
}

.nearsport-review-form textarea {
  resize: vertical;
}

.nearsport-review-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nearsport-review-form-actions button {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: #059669;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.nearsport-review-form-actions button.secondary {
  background: #e2e8f0;
  color: #334155;
}

.nearsport-review-form-actions button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.nearsport-place-card-attribution {
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
  margin-top: 20px;
  font-size: 10px;
  color: #94a3b8;
}

@media (max-width: 600px) {
  .nearsport-place-card {
    top: auto;
    left: 10px;
    bottom: 18px;
    width: calc(100% - 20px);
    max-height: 65%;
    border-radius: 18px;
  }

  .nearsport-place-card-content {
    padding: 20px;
  }

  .nearsport-place-card h2 {
    font-size: 20px;
  }
}
`;

// ============================================================
// MAIN NEARSPOT MAP
// ============================================================

function NearSpotMap({
  location,
  userLocation,
  spots = [],
  onMyLocation,
  isSelectingSpot = false,
  selectedSpotLocation = null,
  onSpotLocationSelect,
}) {
  const [externalPlaces, setExternalPlaces] =
    useState([]);

  const [
    selectedExternalPlace,
    setSelectedExternalPlace,
  ] = useState(null);

  function handleExternalPlaceClick(place) {
    setSelectedExternalPlace(place);
  }

  function handleClosePlaceCard() {
    setSelectedExternalPlace(null);
  }

  if (!location) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const position = [latitude, longitude];

  return (
    <>
      <style>{mapStyles}</style>

      <MapContainer
        className="nearsport-map"
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#eef2f2",
        }}
      >
        {/* OPENSTREETMAP TILES */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* MAP CLICK EVENTS */}
        <MapClickHandler
          onClose={handleClosePlaceCard}
          isSelectingSpot={isSelectingSpot}
          onSpotLocationSelect={onSpotLocationSelect}
        />

        {/* LOCATION CONTROLLER */}
        <MapLocationController location={location} />

        {/* EXTERNAL PLACE DISCOVERY */}
        <ExternalPlaceDiscovery
          onPlacesChange={setExternalPlaces}
        />

        {/* MAP CONTROLS */}
        <MapControls onMyLocation={onMyLocation} />

        {/* USER LOCATION */}
        {userLocation && (
          <UserLocationMarker location={userLocation} />
        )}

        {/* APPROVED HIDDENSPOTS */}
        {spots.map((spot) => (
          <SpotMarker
            key={spot.id}
            spot={spot}
          />
        ))}

        {/* OPENSTREETMAP PLACES */}
        {externalPlaces.map((place) => (
          <ExternalPlaceMarker
            key={`${place.osm_type}-${place.osm_id}`}
            place={place}
            onPlaceClick={handleExternalPlaceClick}
          />
        ))}

        {/* NEW HIDDENSPOT TEMPORARY MARKER */}
        {isSelectingSpot && selectedSpotLocation && (
          <Marker
            position={[
              selectedSpotLocation.latitude,
              selectedSpotLocation.longitude,
            ]}
            icon={newSpotIcon}
            draggable={true}
            zIndexOffset={1000}
            eventHandlers={{
              dragend: (event) => {
                const position = event.target.getLatLng();

                onSpotLocationSelect?.({
                  latitude: position.lat,
                  longitude: position.lng,
                });
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -35]}
            >
              Drag to adjust your HiddenSpot location
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* SELECTED EXTERNAL PLACE DETAILS */}
      {selectedExternalPlace && (
        <SelectedExternalPlaceCard
          key={
            `${selectedExternalPlace.osm_type}-` +
            `${selectedExternalPlace.osm_id}`
          }
          place={selectedExternalPlace}
          onClose={handleClosePlaceCard}
        />
      )}
    </>
  );
}

export default NearSpotMap;
