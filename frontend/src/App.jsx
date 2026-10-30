import { useCallback, useEffect, useRef, useState } from "react";
import {
  useLocation as useRouterLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import useLocation from "./hooks/useLocation";
import useNearbySpots from "./hooks/useNearbySpots";

import NearSpotMap from "./components/map/NearSpotMap";
import NearSpotSidebar from "./components/layout/NearSpotSidebar";
import NotificationBell from "./components/common/NotificationBell";
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
const TOP_BAR_HEIGHT = 80;
const SIDEBAR_COLLAPSED_WIDTH = 76;
const SIDEBAR_EXPANDED_WIDTH = 320;
const DIRECTIONS_PANEL_WIDTH = 420;
const MAX_GPS_ACCURACY_METERS = 100;
const MAX_GPS_AGE_MS = 20_000;

// ============================================================
// HELPERS
// ============================================================

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return "Unable to complete the request. Please try again.";
  }

  if (typeof data === "string") return data;

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
      .join(" | ") || "Unable to complete the request."
  );
}

function loadRecentSearches() {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (error) {
    console.warn("Unable to load recent searches:", error);
    return [];
  }
}

function validCoordinates(place) {
  if (!place || place.latitude == null || place.longitude == null) {
    return null;
  }

  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function isFreshAccurateGps(location) {
  if (!location) return false;

  const timestamp = Number(location.timestamp);
  const accuracy = Number(location.accuracy);
  const age = Date.now() - timestamp;

  return (
    validCoordinates(location) !== null &&
    Number.isFinite(timestamp) &&
    age >= -5000 &&
    age <= MAX_GPS_AGE_MS &&
    Number.isFinite(accuracy) &&
    accuracy > 0 &&
    accuracy <= MAX_GPS_ACCURACY_METERS
  );
}

// ============================================================
// APP
// ============================================================

function App() {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  const navigationDestination =
    routerLocation.state?.navigationDestination ?? null;

  const selectedMapSpot =
    routerLocation.state?.selectedSpot ?? null;

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
  // GPS HOOK
  // ============================================================

  const {
    location,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
    getFreshLocation,
    freshLocationLoading,
    freshLocationError,
    startWatchingLocation,
    stopWatchingLocation,
  } = useLocation();

  // ============================================================
  // AUTH MODAL AND MESSAGES
  // ============================================================

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("login");
  const [pendingAction, setPendingAction] = useState(null);

  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageType, setActionMessageType] =
    useState("success");

  const showMessage = useCallback((message, type = "success") => {
    setActionMessage(message);
    setActionMessageType(type);
  }, []);

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
  const [spotGpsLocation, setSpotGpsLocation] = useState(null);
  const [spotGpsLoading, setSpotGpsLoading] = useState(false);

  const [showSpotForm, setShowSpotForm] = useState(false);
  const [spotCategories, setSpotCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] =
    useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [submittingSpot, setSubmittingSpot] = useState(false);

  const startAddSpot = useCallback(() => {
    setSelectedSpotLocation(null);
    setSpotGpsLocation(null);
    setIsSelectingSpot(true);
    setShowSpotForm(false);
    setActionMessage("");
  }, []);

  const cancelSpotSelection = useCallback(() => {
    if (spotGpsLoading || submittingSpot) return;

    setIsSelectingSpot(false);
    setSelectedSpotLocation(null);
    setSpotGpsLocation(null);
    setShowSpotForm(false);
    setActionMessage("");
  }, [spotGpsLoading, submittingSpot]);

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

  // ============================================================
  // ACQUIRE GPS SPECIFICALLY FOR HIDDENSPOT SUBMISSION
  // ============================================================

  const handleGetSpotGpsLocation = useCallback(async () => {
    if (spotGpsLoading || submittingSpot) return;

    setSpotGpsLoading(true);
    setSpotGpsLocation(null);
    setSelectedSpotLocation(null);
    setActionMessage("");

    try {
      const freshLocation = await getFreshLocation();

      if (!freshLocation) {
        showMessage(
          freshLocationError ||
            "Unable to obtain a reliable GPS location. Check location permissions and retry.",
          "warning"
        );
        return;
      }

      if (!isFreshAccurateGps(freshLocation)) {
        showMessage(
          "Your GPS reading is inaccurate or outdated. Please obtain a fresh location.",
          "warning"
        );
        return;
      }

      const coordinates = validCoordinates(freshLocation);

      if (!coordinates) {
        showMessage(
          "The GPS provider returned invalid coordinates.",
          "danger"
        );
        return;
      }

      const verifiedLocation = {
        ...coordinates,
        accuracy: Number(freshLocation.accuracy),
        timestamp: Number(freshLocation.timestamp),
      };

      setSpotGpsLocation(verifiedLocation);
      setSelectedSpotLocation(coordinates);

      showMessage(
        `Current GPS location acquired with approximately ${Math.round(
          verifiedLocation.accuracy
        )} m accuracy. Confirm to continue.`,
        "success"
      );
    } catch (error) {
      console.error("HiddenSpot GPS acquisition failed:", error);

      showMessage(
        "Unable to obtain your current GPS location. Please retry.",
        "danger"
      );
    } finally {
      setSpotGpsLoading(false);
    }
  }, [
    spotGpsLoading,
    submittingSpot,
    getFreshLocation,
    freshLocationError,
    showMessage,
  ]);

  // ============================================================
  // CONFIRM GPS LOCATION
  // ============================================================

  const handleConfirmSpotLocation = () => {
    if (!spotGpsLocation || !selectedSpotLocation) {
      showMessage(
        "Obtain your current GPS location before continuing.",
        "warning"
      );
      return;
    }

    if (!isFreshAccurateGps(spotGpsLocation)) {
      setSpotGpsLocation(null);
      setSelectedSpotLocation(null);

      showMessage(
        "Your GPS reading has expired or is no longer sufficiently accurate. Please retry.",
        "warning"
      );
      return;
    }

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
    setSpotGpsLocation(null);
    setActionMessage("");
  };

  // ============================================================
  // LOAD SPOT CATEGORIES
  // ============================================================

  useEffect(() => {
    if (!showSpotForm) return undefined;

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

    if (!isFreshAccurateGps(spotGpsLocation)) {
      showMessage(
        "Your verified GPS location has expired. Close this form and obtain your current location again.",
        "warning"
      );
      return;
    }

    if (
      !Array.isArray(formData.images) ||
      formData.images.length !== 3
    ) {
      showMessage(
        "Please select exactly 3 images before submitting.",
        "danger"
      );
      return;
    }

    // Always use confirmed GPS coordinates, never form coordinates.
    const submissionData = {
      ...formData,
      latitude: spotGpsLocation.latitude,
      longitude: spotGpsLocation.longitude,
    };

    setSubmittingSpot(true);
    setActionMessage("");

    try {
      const result = await submitHiddenSpot(submissionData);

      const {
        spot,
        failedImages = [],
        uploadedImages = [],
        isComplete,
      } = result;

      setShowSpotForm(false);
      setIsSelectingSpot(false);
      setSelectedSpotLocation(null);
      setSpotGpsLocation(null);

      if (
        isComplete === true &&
        failedImages.length === 0 &&
        uploadedImages.length === 3
      ) {
        showMessage(
          "HiddenSpot submitted successfully! All 3 images uploaded. Your submission is now pending approval.",
          "success"
        );
      } else {
        const failedNames = failedImages
          .map((image) => image.filename)
          .filter(Boolean);

        const failedDetails = failedNames.length
          ? ` Failed images: ${failedNames.join(", ")}.`
          : "";

        showMessage(
          `HiddenSpot #${spot?.id ?? "unknown"} was created, but all 3 images were not uploaded. The submission is incomplete and must not be considered ready for approval.${failedDetails}`,
          "warning"
        );
      }
    } catch (error) {
      console.error("HiddenSpot submission failed:", error);

      showMessage(
        error?.message || getApiErrorMessage(error),
        "danger"
      );
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
    setSpotGpsLocation(null);
    setShowSpotForm(false);

    navigate("/");
  };

  // ============================================================
  // MAP AND DIRECTIONS STATE
  // ============================================================

  const [radius, setRadius] = useState(5000);
  const [mapLocation, setMapLocation] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);
  const [directionsVisible, setDirectionsVisible] =
    useState(false);
  const [directionsProps, setDirectionsProps] = useState(null);

  const navigationActionsRef = useRef(null);
  const hasSelectedPlaceRef = useRef(false);
  const hasAppliedInitialGpsRef = useRef(false);

  const directionsDismissedRef = useRef(false);
  const lastDirectionsRouteRef = useRef(null);

  const handleDirectionsChange = useCallback((nextDirections) => {
    setDirectionsProps(nextDirections);

    if (!nextDirections) {
      setDirectionsVisible(false);
      lastDirectionsRouteRef.current = null;
      directionsDismissedRef.current = false;
      return;
    }

    const nextRoute = nextDirections.route;

    // Reopen Directions when a new route is created.
    if (
      nextRoute &&
      nextRoute !== lastDirectionsRouteRef.current
    ) {
      lastDirectionsRouteRef.current = nextRoute;
      directionsDismissedRef.current = false;
      setDirectionsVisible(true);
    } else if (!directionsDismissedRef.current) {
      setDirectionsVisible(true);
    }

    if (!directionsDismissedRef.current) {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleCloseDirectionsPanel = useCallback(() => {
    // Hide the panel without clearing the route or stopping GPS.
    directionsDismissedRef.current = true;
    setDirectionsVisible(false);
  }, []);

  const handleSidebarSectionSelect = useCallback(
    (sectionId) => {
      if (submittingSpot || spotGpsLoading) {
        return;
      }

      // Close the previous HiddenSpot selection panel.
      setIsSelectingSpot(false);
      setShowSpotForm(false);
      setSelectedSpotLocation(null);
      setSpotGpsLocation(null);
      setActionMessage("");

      // Hide Directions without clearing the route or stopping navigation.
      directionsDismissedRef.current = true;
      setDirectionsVisible(false);
    },
    [submittingSpot, spotGpsLoading]
  );

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, []);

  // ============================================================
  // CENTER MAP ON SELECTED DESTINATION
  // ============================================================

  useEffect(() => {
    const destination =
      navigationDestination || selectedMapSpot;

    const coordinates = validCoordinates(destination);

    if (!coordinates) return;

    hasSelectedPlaceRef.current = true;
    setMapLocation(coordinates);
  }, [navigationDestination, selectedMapSpot]);

  // ============================================================
  // SEARCH STATE
  // ============================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] =
    useState(-1);

  const searchDebounceRef = useRef(null);
  const searchRequestIdRef = useRef(0);

  const [recentSearches, setRecentSearches] =
    useState(loadRecentSearches);

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

  useEffect(() => {
    const query = searchQuery.trim();
    const requestId = ++searchRequestIdRef.current;

    clearTimeout(searchDebounceRef.current);

    if (query.length < 3) {
      setSearchSuggestions([]);
      setSuggestionsOpen(false);
      setSearchLoading(false);
      return undefined;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const params = new URLSearchParams({
          q: query,
          limit: "5",
        });

        const response = await fetch(
          `https://photon.komoot.io/api/?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Search service unavailable.");
        }

        const results = await response.json();

        if (requestId !== searchRequestIdRef.current) return;

        const suggestions = (results.features || [])
          .map((feature) => {
            const [longitude, latitude] = feature.geometry.coordinates;
            const properties = feature.properties || {};

            const address = [
              properties.street,
              properties.housenumber,
              properties.city || properties.locality,
              properties.state,
              properties.country,
            ]
              .filter(Boolean)
              .join(", ");

            return {
              id: `${properties.osm_type || "place"}-${properties.osm_id || `${latitude}-${longitude}`}`,
              name:
                properties.name ||
                properties.street ||
                properties.city ||
                "Unnamed place",
              displayName: address || properties.name || "Unknown address",
              latitude: Number(latitude),
              longitude: Number(longitude),
            };
          })
          .filter(
            (place) =>
              Number.isFinite(place.latitude) &&
              Number.isFinite(place.longitude)
          );

        setSearchSuggestions(suggestions);
        setSuggestionsOpen(true);

        if (!suggestions.length) {
          setSearchError("No matching locations found.");
        }
      } catch (error) {
        if (requestId !== searchRequestIdRef.current) return;

        console.error("Location autocomplete failed:", error);
        setSearchSuggestions([]);
        setSearchError("Unable to search locations right now.");
        setSuggestionsOpen(true);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearchLoading(false);
        }
      }
    }, 700);

    return () => {
      clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchSuggestions([]);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  }, [searchQuery]);

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
    startWatchingLocation();

    return () => {
      stopWatchingLocation();
    };
  }, [
    getCurrentLocation,
    startWatchingLocation,
    stopWatchingLocation,
  ]);

  useEffect(() => {
    if (!location || hasSelectedPlaceRef.current) return;
    if (hasAppliedInitialGpsRef.current) return;

    const coordinates = validCoordinates(location);
    if (!coordinates) return;

    hasAppliedInitialGpsRef.current = true;
    setMapLocation(coordinates);
  }, [location]);

  // ============================================================
  // FALLBACK LOCATION FOR MAP DISPLAY ONLY
  // ============================================================

  useEffect(() => {
    if (mapLocation) return undefined;

    const timeoutId = setTimeout(() => {
      if (!hasSelectedPlaceRef.current) {
        setMapLocation((current) => current ?? DEFAULT_LOCATION);
      }
    }, LOCATION_FALLBACK_DELAY);

    return () => clearTimeout(timeoutId);
  }, [mapLocation]);

  // ============================================================
  // PLACE SELECTION — MAP SEARCH ONLY
  // ============================================================

  const handlePlaceSelect = useCallback((selectedLocation) => {
    const coordinates = validCoordinates(selectedLocation);
    if (!coordinates) return;

    hasSelectedPlaceRef.current = true;
    setMapLocation(coordinates);

    // Map selection never sets HiddenSpot submission coordinates.
  }, []);

  const handleSuggestionSelect = useCallback(
    (place) => {
      const coordinates = validCoordinates(place);
      if (!coordinates) return;

      const destination = {
        ...place,
        ...coordinates,
        name: place.name || place.displayName || "Selected destination",
      };

      setSearchQuery(place.name || place.displayName);

      // Invalidate any pending autocomplete request.
      searchRequestIdRef.current += 1;

      setSearchSuggestions([]);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      setSearchError("");

      setRecentSearches((previous) =>
        [
          destination,
          ...previous.filter((item) => item.id !== destination.id),
        ].slice(0, 5)
      );

      handlePlaceSelect(coordinates);

      // Show the destination pin without requesting directions.
      navigationActionsRef.current?.selectDestination?.(destination);
    },
    [handlePlaceSelect]
  );

  // ============================================================
  // GPS LOCATION BUTTON
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

      const coordinates = validCoordinates(currentLocation);

      if (!coordinates) {
        showMessage(
          "Invalid GPS coordinates received.",
          "danger"
        );
        return;
      }

      hasSelectedPlaceRef.current = true;
      hasAppliedInitialGpsRef.current = true;
      setMapLocation(coordinates);
      setActionMessage("");
    } catch (error) {
      console.error("GPS location failed:", error);

      showMessage(
        "Unable to get your current location. Check location permissions.",
        "danger"
      );
    }
  }, [getCurrentLocation, showMessage]);

  // ============================================================
  // OPENSTREETMAP NOMINATIM SEARCH
  // ============================================================

  const handleSearch = (event) => {
    event.preventDefault();

    const selected =
      searchSuggestions[activeSuggestionIndex] ||
      searchSuggestions[0];

    if (selected) {
      handleSuggestionSelect(selected);
    } else if (searchQuery.trim().length >= 3) {
      setSuggestionsOpen(true);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "ArrowDown" && searchSuggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);

      setActiveSuggestionIndex((previous) =>
        previous >= searchSuggestions.length - 1 ? 0 : previous + 1
      );
    } else if (
      event.key === "ArrowUp" &&
      searchSuggestions.length
    ) {
      event.preventDefault();

      setActiveSuggestionIndex((previous) =>
        previous <= 0 ? searchSuggestions.length - 1 : previous - 1
      );
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  // ============================================================
  // SIDEBAR AND SEARCH DIMENSIONS
  // ============================================================

  const sidebarWidth = sidebarCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_EXPANDED_WIDTH;

  const leftContentWidth =
    sidebarWidth +
    (directionsVisible ? DIRECTIONS_PANEL_WIDTH : 0);

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
      {/* MAP */}

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
            isSelectingSpot={false}
            selectedSpotLocation={null}
            onSpotLocationSelect={() => {}}
            navigationDestination={navigationDestination}
            onDirectionsChange={handleDirectionsChange}
            navigationActionsRef={navigationActionsRef}
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

      {/* TOP BAR BACKGROUND */}

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

      {/* SIDEBAR AND DIRECTIONS */}

      <NearSpotSidebar
        collapsed={sidebarCollapsed}
        directionsVisible={directionsVisible}
        directionsProps={directionsProps}
        navigationActionsRef={navigationActionsRef}
        onCloseDirections={handleCloseDirectionsPanel}
        onSectionSelect={handleSidebarSectionSelect}
        onToggle={handleSidebarToggle}
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

      {/* SEARCH BAR */}

      <div
        className="position-absolute"
        style={{
          zIndex: 1050,
          top: "12px",
          left: `${leftContentWidth + 20}px`,
          width: `min(620px, max(0px, calc(100vw - ${leftContentWidth + 300}px)))`,
          maxWidth: `calc(100vw - ${leftContentWidth + 24}px)`,
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
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setActiveSuggestionIndex(-1);
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => {
              if (searchSuggestions.length) {
                setSuggestionsOpen(true);
              }
            }}
            autoComplete="off"
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

        {suggestionsOpen && searchSuggestions.length > 0 && (
          <div
            className="position-absolute top-100 start-0 end-0 mt-2 bg-white border rounded-4 shadow-lg overflow-hidden"
            style={{
              zIndex: 1060,
              maxHeight: "360px",
              overflowY: "auto",
            }}
            role="listbox"
            aria-label="Place suggestions"
          >
            {searchSuggestions.map((place, index) => (
              <button
                key={place.id}
                type="button"
                role="option"
                aria-selected={index === activeSuggestionIndex}
                className={`w-100 text-start border-0 px-3 py-3 d-flex align-items-start gap-3 ${
                  index === activeSuggestionIndex
                    ? "bg-success bg-opacity-10"
                    : "bg-white"
                }`}
                style={{
                  borderBottom:
                    index < searchSuggestions.length - 1
                      ? "1px solid #eee"
                      : "none",
                }}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                onClick={() => handleSuggestionSelect(place)}
              >
                <i className="bi bi-geo-alt text-success fs-5 mt-1" />

                <span className="d-flex flex-column overflow-hidden">
                  <strong className="text-dark small">
                    {place.name}
                  </strong>

                  <span className="text-secondary small text-wrap">
                    {place.displayName}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {searchError && (
          <div
            className="alert alert-danger small mt-2 py-2 shadow-sm"
            role="alert"
          >
            {searchError}
          </div>
        )}
      </div>

      {/* ACCOUNT AND GPS CONTROLS */}

      <div
        className="position-absolute top-0 end-0 d-flex align-items-center gap-3"
        style={{
          zIndex: 1050,
          margin: "12px 24px",
        }}
      >
        {isAuthenticated && (
          <div className="flex-shrink-0">
            <NotificationBell />
          </div>
        )}

        <button
          type="button"
          className="btn bg-white border shadow-sm rounded-4 d-flex align-items-center gap-2 px-3 py-2"
          onClick={handleMyLocation}
          disabled={locationLoading}
          title="Go to my location"
        >
          <i className="bi bi-crosshair fs-5 text-success" />

          <span className="d-none d-xl-flex flex-column align-items-start lh-sm">
            <span className="small text-secondary">Location</span>
            <strong className="small text-success">
              {locationLoading
                ? "Finding..."
                : location
                  ? "ON"
                  : "OFF"}
            </strong>
          </span>
        </button>

        {/* ACCOUNT MENU */}

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
              style={{ width: "48px", height: "48px" }}
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
                      onClick={() => navigate("/user/submissions")}
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

      {/* HIDDENSPOT GPS CONFIRMATION PANEL */}

      {isSelectingSpot && (
        <div
          className="position-absolute"
          style={{
            zIndex: 1200,
            bottom: "clamp(12px, 3vh, 24px)",
            right: "clamp(12px, 3vw, 24px)",
            width: "min(430px, calc(100vw - 24px))",
            maxHeight: "calc(100dvh - 120px)",
            overflowY: "auto",
          }}
        >
          <div
            className="card border-0 shadow-lg overflow-hidden"
            style={{
              borderRadius: "24px",
              background: "rgba(255,255,255,0.98)",
            }}
          >
            {/* PANEL HEADER */}

            <div
              className="p-4 text-white"
              style={{
                background:
                  "linear-gradient(135deg, #087f5b 0%, #099268 55%, #20a879 100%)",
              }}
            >
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-4 flex-shrink-0"
                    style={{
                      width: 48,
                      height: 48,
                      background: "rgba(255,255,255,0.16)",
                    }}
                  >
                    <i className="bi bi-geo-alt-fill fs-3" />
                  </div>

                  <div>
                    <div className="small text-white-50 fw-semibold mb-1">
                      SHARE WITH THE COMMUNITY
                    </div>
                    <h5 className="fw-bold mb-0">
                      Add a HiddenSpot
                    </h5>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm rounded-circle text-white d-flex align-items-center justify-content-center"
                  style={{
                    width: 34,
                    height: 34,
                    background: "rgba(255,255,255,0.16)",
                  }}
                  aria-label="Cancel HiddenSpot submission"
                  onClick={cancelSpotSelection}
                  disabled={spotGpsLoading || submittingSpot}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <p className="small text-white-50 mt-3 mb-0">
                Your HiddenSpot must be registered using your
                device's current GPS location.
              </p>
            </div>

            <div className="card-body p-4">
              {/* GPS REQUIREMENTS */}

              <div className="d-flex align-items-start gap-3 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    background: "#e6fcf5",
                    color: "#087f5b",
                  }}
                >
                  <i className="bi bi-shield-check fs-5" />
                </div>

                <div>
                  <div className="fw-semibold">
                    Verify your current location
                  </div>
                  <div className="small text-secondary mt-1">
                    For accuracy, your GPS reading must be recent
                    and within 100 metres. Map search and manually
                    selected coordinates cannot be used.
                  </div>
                </div>
              </div>

              {/* GET GPS BUTTON */}

              <button
                type="button"
                className="btn btn-success w-100 py-3 rounded-3 fw-semibold"
                onClick={handleGetSpotGpsLocation}
                disabled={spotGpsLoading || freshLocationLoading || submittingSpot}
              >
                {spotGpsLoading || freshLocationLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Getting a fresh GPS reading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-crosshair me-2" />
                    Get My Current GPS Location
                  </>
                )}
              </button>

              {/* GPS ERROR */}

              {freshLocationError && !spotGpsLocation && (
                <div
                  className="alert alert-warning d-flex align-items-start gap-2 small mt-3 mb-0"
                  role="alert"
                >
                  <i className="bi bi-exclamation-triangle-fill mt-1" />
                  <span>{freshLocationError}</span>
                </div>
              )}

              {/* GPS RESULT */}

              {spotGpsLocation ? (
                <div
                  className="rounded-4 p-3 mt-3"
                  style={{
                    background: isFreshAccurateGps(spotGpsLocation)
                      ? "#f0fdf4"
                      : "#fff7ed",
                    border: `1px solid ${
                      isFreshAccurateGps(spotGpsLocation)
                        ? "#bbf7d0"
                        : "#fed7aa"
                    }`,
                  }}
                >
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i
                      className={`bi ${
                        isFreshAccurateGps(spotGpsLocation)
                          ? "bi-check-circle-fill text-success"
                          : "bi-exclamation-circle-fill text-warning"
                      } fs-5`}
                    />

                    <div className="fw-semibold">
                      {isFreshAccurateGps(spotGpsLocation)
                        ? "GPS location verified"
                        : "GPS reading expired"}
                    </div>

                    <span
                      className={`badge ms-auto ${
                        isFreshAccurateGps(spotGpsLocation)
                          ? "text-bg-success"
                          : "text-bg-warning"
                      }`}
                    >
                      {isFreshAccurateGps(spotGpsLocation)
                        ? "Verified"
                        : "Retry"}
                    </span>
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <div className="small text-secondary mb-1">
                        Latitude
                      </div>
                      <div className="fw-semibold font-monospace small text-break">
                        {spotGpsLocation.latitude.toFixed(6)}
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="small text-secondary mb-1">
                        Longitude
                      </div>
                      <div className="fw-semibold font-monospace small text-break">
                        {spotGpsLocation.longitude.toFixed(6)}
                      </div>
                    </div>
                  </div>

                  <hr className="my-3" />

                  <div className="d-flex align-items-center justify-content-between gap-3">
                    <span className="small text-secondary">
                      Estimated GPS accuracy
                    </span>
                    <span className="fw-semibold small">
                      {Math.round(spotGpsLocation.accuracy)} metres
                    </span>
                  </div>

                  <div className="progress mt-2" style={{ height: 5 }}>
                    <div
                      className="progress-bar bg-success"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            (1 -
                              spotGpsLocation.accuracy /
                                MAX_GPS_ACCURACY_METERS) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="small text-secondary mt-2">
                    {isFreshAccurateGps(spotGpsLocation)
                      ? "This reading meets the location requirements."
                      : "Get a new GPS reading before continuing."}
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-3 p-3 mt-3 small text-secondary"
                  style={{
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <i className="bi bi-info-circle me-2 text-success" />
                  Your coordinates will appear here after a successful
                  GPS reading.
                </div>
              )}

              {/* PANEL FOOTER */}

              <div className="d-flex gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-light border rounded-3 py-2 flex-fill fw-semibold"
                  onClick={cancelSpotSelection}
                  disabled={spotGpsLoading || submittingSpot}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-success rounded-3 py-2 flex-fill fw-semibold"
                  onClick={handleConfirmSpotLocation}
                  disabled={
                    !isFreshAccurateGps(spotGpsLocation) ||
                    spotGpsLoading ||
                    submittingSpot
                  }
                >
                  Continue
                  <i className="bi bi-arrow-right ms-2" />
                </button>
              </div>

              <div className="small text-secondary text-center mt-3">
                <i className="bi bi-lock-fill me-1" />
                Only a verified current GPS reading can be submitted.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION NOTIFICATION */}

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

      {/* STATUS MESSAGES */}

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

      {/* HIDDENSPOT DETAILS FORM */}

      <HiddenSpotForm
        show={showSpotForm}
        location={spotGpsLocation}
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

      {/* LOGIN / REGISTER MODAL */}

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