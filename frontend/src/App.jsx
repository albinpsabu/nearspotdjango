
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import useLocation from "./hooks/useLocation";
import useNearbySpots from "./hooks/useNearbySpots";

import NearSpotMap from "./components/map/NearSpotMap";
import NearSpotSidebar from "./components/layout/NearSpotSidebar";
import StatusMessage from "./components/common/StatusMessage";
import AuthModal from "./components/auth/AuthModal";
import HiddenSpotForm from "./components/spots/HiddenSpotForm";

import {
  getSpotCategories,
  submitHiddenSpot,
} from "./services/hiddenSpotService";

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_LOCATION = {
  latitude: 8.5241,
  longitude: 76.9366,
};

const LOCATION_FALLBACK_DELAY = 2500;
const RECENT_SEARCHES_KEY = "nearspot_recent_searches";

// Reduced from 104px to 80px.
const TOP_BAR_HEIGHT = 80;

const SIDEBAR_COLLAPSED_WIDTH = 76;
const SIDEBAR_EXPANDED_WIDTH = 320;

// ============================================================
// HELPERS
// ============================================================

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return "Unable to complete the request. Please try again.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail || data.error) {
    return String(data.detail || data.error);
  }

  return (
    Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);

        return `${field}: ${message}`;
      })
      .join(" | ") ||
    "Unable to complete the request."
  );
}

function loadRecentSearches() {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (error) {
    console.warn("Unable to load recent searches:", error);
    return [];
  }
}

// ============================================================
// APP
// ============================================================

function App() {
  const navigate = useNavigate();

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  const {
    user,
    isAuthenticated,
    loading: authLoading,
    logout,
  } = useAuth();

  const role = user?.role?.toUpperCase();

  const dashboardPath =
    role === "ADMIN"
      ? "/admin"
      : role === "EMPLOYEE"
      ? "/employee"
      : "/user";

  const profilePath =
    role === "EMPLOYEE"
      ? "/employee/profile"
      : role === "USER"
      ? "/user/profile"
      : dashboardPath;

  // ============================================================
  // AUTH MODAL
  // ============================================================

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("login");
  const [pendingAction, setPendingAction] = useState(null);

  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageType, setActionMessageType] =
    useState("success");

  const showMessage = useCallback(
    (message, type = "success") => {
      setActionMessage(message);
      setActionMessageType(type);
    },
    []
  );

  const openAuthModal = useCallback((tab = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setPendingAction(null);
  }, []);

  // ============================================================
  // HIDDENSPOT CREATION
  // ============================================================

  const [isSelectingSpot, setIsSelectingSpot] = useState(false);

  const [selectedSpotLocation, setSelectedSpotLocation] =
    useState(null);

  const [showSpotForm, setShowSpotForm] = useState(false);
  const [spotCategories, setSpotCategories] = useState([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(false);

  const [categoriesError, setCategoriesError] = useState("");
  const [submittingSpot, setSubmittingSpot] = useState(false);

  const startAddSpot = useCallback(() => {
    setSelectedSpotLocation(null);
    setIsSelectingSpot(true);
    setShowSpotForm(false);
    setActionMessage("");
  }, []);

  const cancelSpotSelection = useCallback(() => {
    setIsSelectingSpot(false);
    setSelectedSpotLocation(null);
    setShowSpotForm(false);
    setActionMessage("");
  }, []);

  const handleAddSpot = () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setPendingAction("addSpot");
      openAuthModal("login");
      return;
    }

    if (role !== "USER") {
      showMessage(
        "HiddenSpot submissions are available only to USER accounts.",
        "warning"
      );
      return;
    }

    startAddSpot();
  };

  const handleAuthSuccess = (currentUser) => {
    const action = pendingAction;

    setAuthModalOpen(false);
    setPendingAction(null);

    if (action === "addSpot") {
      if (currentUser?.role?.toUpperCase() === "USER") {
        startAddSpot();
      } else {
        showMessage(
          "HiddenSpot submissions are available only to USER accounts.",
          "warning"
        );
      }
    }
  };

  const handleConfirmSpotLocation = () => {
    if (!selectedSpotLocation) return;

    setIsSelectingSpot(false);
    setShowSpotForm(true);
    setActionMessage("");
  };

  const handleSpotFormBack = () => {
    if (submittingSpot) return;

    setShowSpotForm(false);
    setIsSelectingSpot(true);
    setActionMessage("");
  };

  const handleSpotFormClose = () => {
    if (submittingSpot) return;

    setShowSpotForm(false);
    setIsSelectingSpot(false);
    setSelectedSpotLocation(null);
    setActionMessage("");
  };

  // ============================================================
  // LOAD CATEGORIES
  // ============================================================

  useEffect(() => {
    if (!showSpotForm) return;

    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const categories = await getSpotCategories();

        if (!cancelled) {
          setSpotCategories(categories);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);

        if (!cancelled) {
          setSpotCategories([]);
          setCategoriesError(
            "Unable to load categories. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [showSpotForm]);

  // ============================================================
  // SUBMIT HIDDENSPOT
  // ============================================================

  const handleSpotFormSubmit = async (formData) => {
    if (submittingSpot) return;

    if (!isAuthenticated || role !== "USER") {
      showMessage(
        "Only authenticated USER accounts can submit HiddenSpots.",
        "danger"
      );
      return;
    }

    setSubmittingSpot(true);
    setActionMessage("");

    try {
      const { spot, failedImages } =
        await submitHiddenSpot(formData);

      setShowSpotForm(false);
      setIsSelectingSpot(false);
      setSelectedSpotLocation(null);

      if (failedImages.length > 0) {
        showMessage(
          `HiddenSpot #${spot.id} was submitted for review, ` +
            `but ${failedImages.length} image(s) failed to upload.`,
          "warning"
        );
      } else {
        showMessage(
          "HiddenSpot submitted successfully! " +
            "Your submission is now pending approval.",
          "success"
        );
      }
    } catch (error) {
      console.error("HiddenSpot submission failed:", error);
      showMessage(getApiErrorMessage(error), "danger");
    } finally {
      setSubmittingSpot(false);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    logout();

    setPendingAction(null);
    setAuthModalOpen(false);

    setIsSelectingSpot(false);
    setSelectedSpotLocation(null);
    setShowSpotForm(false);

    navigate("/");
  };

  // ============================================================
  // LOCATION
  // ============================================================

  const {
    location,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
  } = useLocation();

  // ============================================================
  // MAP STATE
  // ============================================================

  const [radius, setRadius] = useState(5000);
  const [mapLocation, setMapLocation] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const hasSelectedPlaceRef = useRef(false);

  // ============================================================
  // SEARCH STATE
  // ============================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [recentSearches, setRecentSearches] =
    useState(loadRecentSearches);

  // Save recent searches across refreshes.
  useEffect(() => {
    try {
      localStorage.setItem(
        RECENT_SEARCHES_KEY,
        JSON.stringify(recentSearches)
      );
    } catch (error) {
      console.warn("Unable to save recent searches:", error);
    }
  }, [recentSearches]);

  // Remove an individual recent search.
  const handleRecentSearchRemove = useCallback((searchId) => {
    setRecentSearches((previous) =>
      previous.filter((item) => item.id !== searchId)
    );
  }, []);

  // ============================================================
  // NEARBY SPOTS
  // ============================================================

  const {
    spots,
    loading: spotsLoading,
    error: spotsError,
  } = useNearbySpots(mapLocation, radius);

  const nearbySpots = Array.isArray(spots) ? spots : [];

  // ============================================================
  // INITIAL LOCATION
  // ============================================================

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (!location || hasSelectedPlaceRef.current) return;

    setMapLocation((current) => current ?? location);
  }, [location]);

  // ============================================================
  // FALLBACK LOCATION
  // ============================================================

  useEffect(() => {
    if (mapLocation) return;

    const timeoutId = setTimeout(() => {
      if (!hasSelectedPlaceRef.current) {
        setMapLocation(
          (current) => current ?? DEFAULT_LOCATION
        );
      }
    }, LOCATION_FALLBACK_DELAY);

    return () => clearTimeout(timeoutId);
  }, [mapLocation]);

  // ============================================================
  // PLACE SELECTION
  // ============================================================

  const handlePlaceSelect = useCallback(
    (selectedLocation) => {
      if (!selectedLocation) return;

      const latitude = Number(selectedLocation.latitude);
      const longitude = Number(selectedLocation.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      const coordinates = { latitude, longitude };

      hasSelectedPlaceRef.current = true;
      setMapLocation(coordinates);

      if (isSelectingSpot) {
        setSelectedSpotLocation(coordinates);
      }
    },
    [isSelectingSpot]
  );

  // ============================================================
  // GPS LOCATION
  // ============================================================

  const handleMyLocation = useCallback(async () => {
    try {
      const currentLocation = await getCurrentLocation();

      if (!currentLocation) {
        showMessage(
          "Unable to get your current location. Check location permissions.",
          "warning"
        );
        return;
      }

      const coordinates = {
        latitude: Number(currentLocation.latitude),
        longitude: Number(currentLocation.longitude),
      };

      if (
        !Number.isFinite(coordinates.latitude) ||
        !Number.isFinite(coordinates.longitude) ||
        coordinates.latitude < -90 ||
        coordinates.latitude > 90 ||
        coordinates.longitude < -180 ||
        coordinates.longitude > 180
      ) {
        showMessage(
          "Invalid GPS coordinates received.",
          "danger"
        );
        return;
      }

      hasSelectedPlaceRef.current = true;
      setMapLocation(coordinates);

      if (isSelectingSpot) {
        setSelectedSpotLocation(coordinates);
      }

      setActionMessage("");
    } catch (error) {
      console.error("GPS location failed:", error);

      showMessage(
        "Unable to get your current location. Check location permissions.",
        "danger"
      );
    }
  }, [getCurrentLocation, isSelectingSpot, showMessage]);

  // ============================================================
  // SEARCH USING OPENSTREETMAP NOMINATIM
  // ============================================================

  const handleSearch = async (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query || searchLoading) return;

    setSearchLoading(true);
    setSearchError("");

    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Search service unavailable.");
      }

      const results = await response.json();

      if (!results.length) {
        setSearchError("No matching location found.");
        return;
      }

      const result = results[0];

      const selectedLocation = {
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      };

      handlePlaceSelect(selectedLocation);

      const searchItem = {
        id: `${result.osm_type}-${result.osm_id}`,
        name: result.display_name,
        ...selectedLocation,
      };

      setRecentSearches((previous) =>
        [
          searchItem,
          ...previous.filter(
            (item) => item.id !== searchItem.id
          ),
        ].slice(0, 5)
      );
    } catch (error) {
      console.error("Location search failed:", error);

      setSearchError(
        "Unable to search locations right now."
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // Keep search aligned with sidebar collapse/expand.
  const sidebarWidth = sidebarCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_EXPANDED_WIDTH;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="position-relative w-100 overflow-hidden bg-light"
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ======================================================
          MAP
      ====================================================== */}

      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ zIndex: 1 }}
      >
        {mapLocation ? (
          <NearSpotMap
            location={mapLocation}
            userLocation={location}
            spots={nearbySpots}
            onMyLocation={handleMyLocation}
            isSelectingSpot={isSelectingSpot}
            selectedSpotLocation={selectedSpotLocation}
            onSpotLocationSelect={setSelectedSpotLocation}
          />
        ) : (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
            <div className="text-center">
              <div
                className="spinner-border text-success"
                role="status"
              />

              <p className="small text-secondary mt-3 mb-0">
                Getting your location...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          CONTINUOUS WHITE TOP BAR
          Reduced height: 104px -> 80px
      ====================================================== */}

      <div
        className="position-absolute bg-white border-bottom"
        style={{
          zIndex: 1040,
          top: 0,
          left: 0,
          right: 0,
          height: `${TOP_BAR_HEIGHT}px`,
          pointerEvents: "none",
        }}
      />

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <NearSpotSidebar
        collapsed={sidebarCollapsed}
        onToggle={() =>
          setSidebarCollapsed((previous) => !previous)
        }
        radius={radius}
        onRadiusChange={setRadius}
        spots={nearbySpots}
        loading={spotsLoading}
        recentSearches={recentSearches}
        onRecentSearchSelect={handlePlaceSelect}
        onRecentSearchRemove={handleRecentSearchRemove}
        onAddSpot={handleAddSpot}
        onLogin={() => {
          setPendingAction(null);
          openAuthModal("login");
        }}
      />

      {/* ======================================================
          SEARCH BAR
          Moved upward to fit the 80px top bar.
      ====================================================== */}

      <div
        className="position-absolute"
        style={{
          zIndex: 1050,
          top: "12px",
          left: `${sidebarWidth + 20}px`,
          width: sidebarCollapsed
            ? "min(620px, calc(100vw - 376px))"
            : "min(620px, calc(100vw - 620px))",
          minWidth: "180px",
          transition: "left 0.3s ease, width 0.3s ease",
        }}
      >
        <form
          onSubmit={handleSearch}
          className="d-flex align-items-center gap-2 bg-white border shadow-sm rounded-4 px-3 py-2"
          role="search"
        >
          <i className="bi bi-search fs-5 text-secondary" />

          <input
            type="search"
            className="form-control border-0 shadow-none bg-transparent"
            placeholder="Search places or locations..."
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            aria-label="Search places or locations"
          />

          {searchLoading ? (
            <span
              className="spinner-border spinner-border-sm text-success"
              role="status"
            />
          ) : (
            <button
              type="submit"
              className="btn btn-success btn-sm rounded-3 px-3"
              disabled={!searchQuery.trim()}
            >
              Search
            </button>
          )}
        </form>

        {searchError && (
          <div
            className="alert alert-danger small mt-2 py-2 shadow-sm"
            role="alert"
          >
            {searchError}
          </div>
        )}
      </div>

      {/* ======================================================
          ACCOUNT AND LOCATION CONTROLS
          Aligned to the shorter top bar.
      ====================================================== */}

      <div
        className="position-absolute top-0 end-0 d-flex align-items-center gap-3"
        style={{
          zIndex: 1050,
          margin: "12px 24px",
        }}
      >
        {/* GPS BUTTON */}
        <button
          type="button"
          className="btn bg-white border shadow-sm rounded-4 d-flex align-items-center gap-2 px-3 py-2"
          onClick={handleMyLocation}
          disabled={locationLoading}
          title="Go to my location"
        >
          <i className="bi bi-crosshair fs-5 text-success" />

          <span className="d-none d-xl-flex flex-column align-items-start lh-sm">
            <span className="small text-secondary">
              Location
            </span>

            <strong className="small text-success">
              {locationLoading
                ? "Finding..."
                : location
                ? "ON"
                : "OFF"}
            </strong>
          </span>
        </button>

        {/* ACCOUNT */}
        {authLoading ? (
          <div className="bg-white rounded-circle shadow-sm p-3">
            <span
              className="spinner-border spinner-border-sm text-success"
              role="status"
            />
          </div>
        ) : isAuthenticated ? (
          <div className="dropdown">
            <button
              type="button"
              className="btn bg-white border shadow-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "48px",
                height: "48px",
              }}
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Account menu"
            >
              <i className="bi bi-person-fill fs-5 text-success" />
            </button>

            <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 p-2">
              <li className="px-3 py-2">
                <div className="fw-bold small">
                  {user?.name || "My Account"}
                </div>

                <div className="small text-secondary">
                  {user?.email}
                </div>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-3"
                  onClick={() => navigate(dashboardPath)}
                >
                  <i className="bi bi-speedometer2 me-2" />
                  Dashboard
                </button>
              </li>

              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-3"
                  onClick={() => navigate(profilePath)}
                >
                  <i className="bi bi-person me-2" />
                  My Profile
                </button>
              </li>

              {role === "USER" && (
                <>
                  <li>
                    <button
                      type="button"
                      className="dropdown-item rounded-3"
                      onClick={() =>
                        navigate("/user/submissions")
                      }
                    >
                      <i className="bi bi-pin-map me-2" />
                      My Submissions
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      className="dropdown-item rounded-3"
                      onClick={() => navigate("/user/saved")}
                    >
                      <i className="bi bi-bookmark-heart me-2" />
                      Saved Spots
                    </button>
                  </li>
                </>
              )}

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-3 text-danger"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-success rounded-4 shadow-sm px-4 py-2 fw-semibold"
            onClick={() => {
              setPendingAction(null);
              openAuthModal("login");
            }}
          >
            <i className="bi bi-box-arrow-in-right me-2" />
            Login
          </button>
        )}
      </div>

      {/* ======================================================
          HIDDENSPOT LOCATION SELECTION PANEL
      ====================================================== */}

      {isSelectingSpot && (
        <div
          className="position-absolute bg-white shadow-lg rounded-4 p-3"
          style={{
            zIndex: 1200,
            bottom: "24px",
            right: "24px",
            width: "min(360px, calc(100vw - 48px))",
          }}
        >
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="fw-bold mb-1">
                <i className="bi bi-geo-alt-fill text-success me-2" />
                Select HiddenSpot Location
              </h5>

              <p className="small text-secondary mb-0">
                Search for a location, click anywhere on the map,
                or use GPS. Drag the marker to fine-tune
                its position.
              </p>
            </div>

            <button
              type="button"
              className="btn-close ms-2"
              aria-label="Cancel location selection"
              onClick={cancelSpotSelection}
            />
          </div>

          {/* GPS LOCATION BUTTON */}
          <button
            type="button"
            className="btn btn-outline-success w-100 mt-3"
            onClick={handleMyLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Finding your location...
              </>
            ) : (
              <>
                <i className="bi bi-crosshair me-2" />
                Use My Current Location
              </>
            )}
          </button>

          {/* SELECTED COORDINATES */}
          {selectedSpotLocation ? (
            <div className="bg-light rounded-3 p-3 my-3">
              <div className="small fw-semibold mb-2">
                Selected coordinates
              </div>

              <div className="small">
                Latitude:{" "}
                {selectedSpotLocation.latitude.toFixed(6)}
              </div>

              <div className="small">
                Longitude:{" "}
                {selectedSpotLocation.longitude.toFixed(6)}
              </div>
            </div>
          ) : (
            <div className="alert alert-info small mt-3 mb-3">
              No location selected yet.
            </div>
          )}

          {/* CANCEL AND CONFIRM */}
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary flex-fill"
              onClick={cancelSpotSelection}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-success flex-fill"
              disabled={!selectedSpotLocation}
              onClick={handleConfirmSpotLocation}
            >
              Confirm Location
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          ACTION NOTIFICATION
      ====================================================== */}

      {actionMessage && (
        <div
          className={`position-absolute bottom-0 start-50 translate-middle-x mb-4 alert alert-${actionMessageType} shadow-sm d-flex align-items-center gap-3`}
          style={{
            zIndex: 2100,
            maxWidth: "90vw",
          }}
          role="status"
        >
          <i className="bi bi-info-circle" />

          <span>{actionMessage}</span>

          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss notification"
            onClick={() => setActionMessage("")}
          />
        </div>
      )}

      {/* ======================================================
          STATUS MESSAGES
      ====================================================== */}

      {spotsLoading && mapLocation && (
        <StatusMessage
          type="loading"
          message="Loading nearby spots..."
        />
      )}

      {spotsError && (
        <StatusMessage
          type="error"
          message="Unable to load nearby spots."
        />
      )}

      {locationLoading && !mapLocation && (
        <StatusMessage
          type="loading"
          message="Getting your location..."
        />
      )}

      {locationError && !locationLoading && (
        <StatusMessage
          type="error"
          message={locationError}
          onRetry={handleMyLocation}
        />
      )}

      {/* ======================================================
          HIDDENSPOT DETAILS FORM
      ====================================================== */}

      <HiddenSpotForm
        show={showSpotForm}
        location={selectedSpotLocation}
        categories={spotCategories}
        categoriesLoading={categoriesLoading}
        onClose={handleSpotFormClose}
        onBack={handleSpotFormBack}
        onSubmit={handleSpotFormSubmit}
        submitting={submittingSpot}
      />

      {showSpotForm && categoriesError && (
        <div
          className="position-absolute top-50 start-50 translate-middle-x alert alert-danger shadow"
          style={{ zIndex: 2100 }}
          role="alert"
        >
          {categoriesError}
        </div>
      )}

      {/* ======================================================
          LOGIN / REGISTER MODAL
      ====================================================== */}

      <AuthModal
        show={authModalOpen}
        initialTab={authModalTab}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
