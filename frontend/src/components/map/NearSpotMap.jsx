import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import api from "../../services/api";

import UserLocationMarker from "./UserLocationMarker";
import SpotMarker from "./SpotMarker";
import MapControls from "./MapControls";
import ExternalPlaceMarker from "./ExternalPlaceMarker";
import RouteLayer from "./RouteLayer";
import NavigationCamera from "./NavigationCamera";
import SelectedExternalPlaceCard from "./SelectedExternalPlaceCard";

import useTravelModes from "../../hooks/navigation/useTravelModes";
import useLiveNavigation from "../../hooks/navigation/useLiveNavigation";
import useRouteDeviation from "../../hooks/navigation/useRouteDeviation";
import useTurnByTurnNavigation from "../../hooks/navigation/useTurnByTurnNavigation";

// ============================================================
// CONFIGURATION
// ============================================================

const EXTERNAL_API = "/spots/external/";

const FETCH_DEBOUNCE_MS = 1200;
const MIN_DISCOVERY_ZOOM = 15;
const MAX_DISCOVERY_AREA_KM2 = 16;

const SERVICE_COOLDOWN_MS = 60000;
const FAILED_REQUEST_COOLDOWN_MS = 60000;

const MAX_CACHED_AREAS = 15;
const MAX_FAILED_KEYS = 50;

const REROUTE_COOLDOWN_MS = 15000;
const MAX_REROUTE_GPS_AGE_MS = 15000;
const MAX_REROUTE_GPS_ACCURACY_METERS = 50;

const MY_LOCATION_ZOOM = 18;
const MY_LOCATION_ANIMATION_SECONDS = 1.5;

// ============================================================
// NEW SPOT MARKER
// ============================================================

const newSpotIcon = L.divIcon({
  className: "bg-transparent border-0",
  html: `
    <div class="d-flex align-items-center justify-content-center
                rounded-circle bg-success text-white border border-4
                border-white shadow-lg fw-bold fs-4"
         style="width:42px;height:42px;">
      +
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
});

// ============================================================
// DESTINATION MARKER
// ============================================================

const destinationIcon = L.divIcon({
  className: "bg-transparent border-0",
  html: `
    <div class="d-flex align-items-center justify-content-center
                rounded-circle bg-danger text-white border border-3
                border-white shadow-lg"
         style="width:38px;height:38px;">
      <i class="bi bi-geo-alt-fill fs-5"></i>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -34],
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

function isValidCoordinates(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function getValidDestination(destination) {
  if (
    destination?.latitude == null ||
    destination?.longitude == null
  ) {
    return null;
  }

  const latitude = Number(destination.latitude);
  const longitude = Number(destination.longitude);

  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function isReliableLiveLocation(location) {
  if (!location) return false;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);
  const timestamp = Number(location.timestamp);

  if (!isValidCoordinates(latitude, longitude)) {
    return false;
  }

  if (
    location.accuracy == null ||
    !Number.isFinite(accuracy) ||
    accuracy <= 0 ||
    accuracy > MAX_REROUTE_GPS_ACCURACY_METERS
  ) {
    return false;
  }

  if (
    location.timestamp == null ||
    !Number.isFinite(timestamp) ||
    timestamp > Date.now() ||
    Date.now() - timestamp > MAX_REROUTE_GPS_AGE_MS
  ) {
    return false;
  }

  return true;
}

// ============================================================
// MAP LOCATION CONTROLLER
// ============================================================

function MapLocationController({
  location,
  navigationActive = false,
  recenterRequest = 0,
  zoom = MY_LOCATION_ZOOM,
}) {
  const map = useMap();
  const previousLocationRef = useRef(null);
  const lastRecenterRequestRef = useRef(recenterRequest);

  function flyToLocation(latitude, longitude) {
    map.invalidateSize();

    map.flyTo([latitude, longitude], zoom, {
      animate: true,
      duration: MY_LOCATION_ANIMATION_SECONDS,
      easeLinearity: 0.25,
    });
  }

  // Fly to a new location when its coordinates change.
  useEffect(() => {
    if (!location || navigationActive) return;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!isValidCoordinates(latitude, longitude)) {
      return;
    }

    const previous = previousLocationRef.current;

    const locationChanged =
      !previous ||
      previous.latitude !== latitude ||
      previous.longitude !== longitude;

    if (!locationChanged) return;

    previousLocationRef.current = {
      latitude,
      longitude,
    };

    flyToLocation(latitude, longitude);
  }, [
    location?.latitude,
    location?.longitude,
    navigationActive,
    map,
    zoom,
  ]);

  // Clicking My Location triggers another fly-to, even if
  // the coordinates are identical to the previous reading.
  useEffect(() => {
    if (recenterRequest === lastRecenterRequestRef.current) {
      return;
    }

    lastRecenterRequestRef.current = recenterRequest;

    if (!location || navigationActive) return;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!isValidCoordinates(latitude, longitude)) {
      return;
    }

    flyToLocation(latitude, longitude);
  }, [
    recenterRequest,
    location,
    navigationActive,
    map,
    zoom,
  ]);

  return null;
}

// ============================================================
// DESTINATION FOCUS CONTROLLER
// ============================================================

function DestinationFocusController({ destination }) {
  const map = useMap();

  useEffect(() => {
    if (!destination) return;

    const latitude = Number(destination.latitude);
    const longitude = Number(destination.longitude);

    if (!isValidCoordinates(latitude, longitude)) return;

    map.flyTo([latitude, longitude], 17, {
      animate: true,
      duration: 1.5,
    });
  }, [destination?.latitude, destination?.longitude, map]);

  return null;
}

// ============================================================
// EXTERNAL OSM PLACE DISCOVERY
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

      if (failedRequestsRef.current.size > MAX_FAILED_KEYS) {
        const oldestKey = failedRequestsRef.current
          .keys()
          .next().value;

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

      if (runningRef.current) {
        pendingRef.current = true;
        return;
      }

      const bounds = getViewport();

      if (!bounds) {
        onPlacesChangeRef.current([]);
        return;
      }

      const cachedArea = findCachedArea(bounds);

      if (cachedArea) {
        onPlacesChangeRef.current(
          filterPlaces(cachedArea.places, bounds)
        );
        return;
      }

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

        const places = Array.isArray(response.data?.places)
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
          serviceRetryAfterRef.current =
            Date.now() + getServerCooldown(error);

          pendingRef.current = false;

          console.warn(
            "NearSpot discovery temporarily unavailable."
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
            "NearSpot discovery network unavailable."
          );

          return;
        }

        console.warn(
          "External place discovery:",
          getApiError(error, "Unable to load nearby places.")
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

      // Ignore clicks on markers, popups, tooltips, and interactive cards.
      // These clicks should not accidentally close the selected place card.
      const interactiveElement = target?.closest?.(
        [
          ".nearsport-external-marker",
          ".leaflet-marker-icon",
          ".leaflet-popup",
          ".leaflet-tooltip",
          ".nearsport-place-card",
          ".nearsport-map-card",
          "[data-map-interactive='true']",
        ].join(", ")
      );

      if (interactiveElement) {
        return;
      }

      // When selecting a spot, use the clicked map coordinates.
      if (isSelectingSpot) {
        onSpotLocationSelect?.({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });

        return;
      }

      // Otherwise, clicking the empty map closes the selected place card.
      onClose?.();
    },
  });

  return null;
}
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
  navigationDestination = null,
  onDirectionsChange,
  navigationActionsRef,
}) {
  const [externalPlaces, setExternalPlaces] = useState([]);
  const [selectedExternalPlace, setSelectedExternalPlace] =
    useState(null);

  const [selectedDestination, setSelectedDestination] =
    useState(null);

  const [activeRoute, setActiveRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [destinationName, setDestinationName] =
    useState("Selected destination");

  const [selectedMode, setSelectedMode] = useState("driving");

  const [isRerouting, setIsRerouting] = useState(false);
  const [rerouteError, setRerouteError] = useState("");

  const cameraActionsRef = useRef(null);
  const [isCameraFollowing, setIsCameraFollowing] =
    useState(true);

  // Incrementing this forces a fly-to when My Location is clicked.
  const [recenterRequest, setRecenterRequest] = useState(0);

  const {
    modes,
    loading: modesLoading,
    error: modesError,
  } = useTravelModes();

  const {
    currentLocation: liveLocation,
    isTracking,
    locationError,
    startTracking,
    stopTracking,
  } = useLiveNavigation();

  useEffect(() => {
    if (isNavigating && activeRoute) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [
    isNavigating,
    Boolean(activeRoute),
    startTracking,
    stopTracking,
  ]);

  const { isOffRoute, distanceFromRoute } =
    useRouteDeviation({
      location: liveLocation,
      route: activeRoute,
      enabled:
        isNavigating &&
        isTracking &&
        Boolean(activeRoute) &&
        !routeLoading,
    });

  const navigation = useTurnByTurnNavigation({
    route: activeRoute,
    location: liveLocation,
    enabled:
      isNavigating &&
      isTracking &&
      Boolean(activeRoute) &&
      !isOffRoute &&
      !routeLoading,
  });

  const routeRequestIdRef = useRef(0);
  const routeLoadingRef = useRef(false);
  const processedDestinationRef = useRef(null);
  const lastRouteAttemptRef = useRef(null);

  const currentDestinationRef = useRef(null);
  const destinationNameRef = useRef("Selected destination");

  const reroutingRef = useRef(false);
  const lastRerouteAtRef = useRef(0);
  const lastRerouteFixRef = useRef(null);
  const navigationSessionRef = useRef(0);

  function handleExternalPlaceClick(place) {
    setSelectedExternalPlace(place);
  }

  function handleClosePlaceCard() {
    setSelectedExternalPlace(null);
  }

  function handleSelectDestination(destination) {
    const coordinates = getValidDestination(destination);

    if (!coordinates) return;

    const name =
      destination?.name ||
      destination?.title ||
      destination?.displayName ||
      "Selected destination";

    setSelectedDestination({
      ...coordinates,
      name,
    });

    setDestinationName(name);
    destinationNameRef.current = name;
    setRouteError("");
  }

  async function requestRoute({ origin, destination, mode }) {
    const response = await api.post("/navigation/routes/", {
      origin_latitude: origin.latitude,
      origin_longitude: origin.longitude,
      destination_latitude: destination.latitude,
      destination_longitude: destination.longitude,
      travel_mode: mode,
    });

    if (!response.data?.features?.length) {
      throw new Error("No route was returned for this destination.");
    }

    return response.data;
  }

  async function handleGetDirections(
    destination,
    mode = selectedMode
  ) {
    if (routeLoadingRef.current) return;

    const validDestination = getValidDestination(destination);

    if (!validDestination) {
      setRouteError("Selected place has invalid coordinates.");
      return;
    }

    lastRouteAttemptRef.current = { destination, mode };

    const nextDestinationName =
      destination?.name ||
      destination?.title ||
      destination?.spot_name ||
      (currentDestinationRef.current?.latitude ===
        validDestination.latitude &&
      currentDestinationRef.current?.longitude ===
        validDestination.longitude
        ? destinationNameRef.current
        : "Selected destination");

    const previousDestination = currentDestinationRef.current;

    const destinationChanged =
      !previousDestination ||
      previousDestination.latitude !== validDestination.latitude ||
      previousDestination.longitude !== validDestination.longitude;

    if (destinationChanged) {
      navigationSessionRef.current += 1;
      setIsNavigating(false);
      stopTracking();
      lastRerouteAtRef.current = 0;
      lastRerouteFixRef.current = null;
      setRerouteError("");
    }

    const requestId = ++routeRequestIdRef.current;

    routeLoadingRef.current = true;
    setRouteLoading(true);
    setRouteError("");

    try {
      let origin = null;

      if (
        isNavigating &&
        !destinationChanged &&
        isReliableLiveLocation(liveLocation)
      ) {
        origin = {
          latitude: Number(liveLocation.latitude),
          longitude: Number(liveLocation.longitude),
        };
      }

      if (!origin) {
        if (!navigator.geolocation) {
          throw new Error(
            "Geolocation is not supported by this browser."
          );
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000,
            }
          );
        });

        if (requestId !== routeRequestIdRef.current) return;

        origin = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }

      const route = await requestRoute({
        origin,
        destination: validDestination,
        mode,
      });

      if (requestId !== routeRequestIdRef.current) return;

      setActiveRoute(route);
      currentDestinationRef.current = validDestination;
      destinationNameRef.current = nextDestinationName;
      setDestinationName(nextDestinationName);

      setSelectedDestination({
        latitude: validDestination.latitude,
        longitude: validDestination.longitude,
        name: nextDestinationName,
      });

      setSelectedExternalPlace(null);
      setRouteError("");
      setRerouteError("");
    } catch (error) {
      if (requestId !== routeRequestIdRef.current) return;

      const locationMessage =
        error?.code === 1
          ? "Location permission was denied."
          : error?.code === 2
          ? "Your location is currently unavailable."
          : error?.code === 3
          ? "Getting your location timed out."
          : null;

      setRouteError(
        locationMessage ||
          getApiError(
            error,
            error?.message || "Unable to calculate directions."
          )
      );
    } finally {
      if (requestId === routeRequestIdRef.current) {
        routeLoadingRef.current = false;
        setRouteLoading(false);
      }
    }
  }

  function handleRetryDirections() {
    const attempt = lastRouteAttemptRef.current;

    if (!attempt || routeLoadingRef.current) return;

    handleGetDirections(attempt.destination, attempt.mode);
  }

  // ============================================================
  // AUTOMATIC REROUTING
  // ============================================================

  useEffect(() => {
    if (
      !isNavigating ||
      !isTracking ||
      !activeRoute ||
      !isOffRoute ||
      routeLoadingRef.current ||
      reroutingRef.current
    ) {
      return;
    }

    const destination = currentDestinationRef.current;

    if (!destination || !isReliableLiveLocation(liveLocation)) {
      return;
    }

    const fixTimestamp = Number(liveLocation.timestamp);

    if (lastRerouteFixRef.current === fixTimestamp) {
      return;
    }

    const now = Date.now();

    if (now - lastRerouteAtRef.current < REROUTE_COOLDOWN_MS) {
      return;
    }

    const requestId = ++routeRequestIdRef.current;
    const navigationSession = navigationSessionRef.current;

    const origin = {
      latitude: Number(liveLocation.latitude),
      longitude: Number(liveLocation.longitude),
    };

    lastRerouteAtRef.current = now;
    lastRerouteFixRef.current = fixTimestamp;

    reroutingRef.current = true;
    routeLoadingRef.current = true;

    setIsRerouting(true);
    setRouteLoading(true);
    setRerouteError("");

    async function reroute() {
      try {
        const route = await requestRoute({
          origin,
          destination,
          mode: selectedMode,
        });

        if (
          requestId !== routeRequestIdRef.current ||
          navigationSession !== navigationSessionRef.current
        ) {
          return;
        }

        setActiveRoute(route);
        setRerouteError("");
      } catch (error) {
        if (
          requestId !== routeRequestIdRef.current ||
          navigationSession !== navigationSessionRef.current
        ) {
          return;
        }

        setRerouteError(
          getApiError(
            error,
            error?.message || "Unable to calculate a new route."
          )
        );
      } finally {
        if (requestId === routeRequestIdRef.current) {
          reroutingRef.current = false;
          routeLoadingRef.current = false;

          setIsRerouting(false);
          setRouteLoading(false);
        }
      }
    }

    reroute();
  }, [
    isNavigating,
    isTracking,
    isOffRoute,
    activeRoute,
    selectedMode,
    liveLocation?.latitude,
    liveLocation?.longitude,
    liveLocation?.accuracy,
    liveLocation?.timestamp,
  ]);

  // ============================================================
  // TRAVEL MODE CHANGE
  // ============================================================

  function handleModeChange(mode) {
    if (mode === selectedMode || routeLoadingRef.current) {
      return;
    }

    const supportedMode = modes.some(
      (item) => (typeof item === "string" ? item : item.id) === mode
    );

    if (!supportedMode) return;

    const destination = currentDestinationRef.current;

    setSelectedMode(mode);

    if (destination) {
      handleGetDirections(destination, mode);
    }
  }

  // ============================================================
  // AUTOMATIC NAVIGATION FROM APP
  // ============================================================

  useEffect(() => {
    if (!navigationDestination) {
      processedDestinationRef.current = null;
      return;
    }

    const latitude = Number(navigationDestination.latitude);
    const longitude = Number(navigationDestination.longitude);

    const destinationKey = [
      navigationDestination.id ?? "external",
      latitude,
      longitude,
    ].join(":");

    if (processedDestinationRef.current === destinationKey) {
      return;
    }

    processedDestinationRef.current = destinationKey;

    handleGetDirections({
      ...navigationDestination,
      latitude,
      longitude,
    });

    // Only react to a new destination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationDestination]);

  // ============================================================
  // START / STOP NAVIGATION
  // ============================================================

  function handleStartNavigation() {
    if (!activeRoute || routeLoadingRef.current) return;

    navigationSessionRef.current += 1;

    setRerouteError("");
    setIsNavigating(true);
  }

  function handleStopNavigation() {
    navigationSessionRef.current += 1;

    if (reroutingRef.current) {
      routeRequestIdRef.current += 1;

      reroutingRef.current = false;
      routeLoadingRef.current = false;

      setIsRerouting(false);
      setRouteLoading(false);
    }

    setIsNavigating(false);
    setRerouteError("");

    stopTracking();
  }

  // ============================================================
  // CLEAR ROUTE
  // ============================================================

  function handleClearRoute() {
    navigationSessionRef.current += 1;
    routeRequestIdRef.current += 1;

    reroutingRef.current = false;
    routeLoadingRef.current = false;

    lastRerouteAtRef.current = 0;
    lastRerouteFixRef.current = null;

    setRouteLoading(false);
    setIsRerouting(false);

    setActiveRoute(null);
    setIsNavigating(false);

    setRouteError("");
    setRerouteError("");
    lastRouteAttemptRef.current = null;

    currentDestinationRef.current = null;
    destinationNameRef.current = "Selected destination";
    setDestinationName("Selected destination");
    setSelectedDestination(null);

    stopTracking();
  }

  // ============================================================
  // SHARE DIRECTIONS WITH THE EXISTING SIDEBAR
  // ============================================================

  if (navigationActionsRef) {
    navigationActionsRef.current = {
      clearRoute: handleClearRoute,
      changeMode: handleModeChange,
      startNavigation: handleStartNavigation,
      stopNavigation: handleStopNavigation,
      getDirections: handleGetDirections,
      selectDestination: handleSelectDestination,
    };
  }

  const lastDirectionsSnapshotRef = useRef(null);

  useEffect(() => {
    if (!onDirectionsChange) return;

    const visible = Boolean(activeRoute || routeLoading);

    const snapshot = visible
      ? {
          modes,
          selectedMode,
          route: activeRoute,
          routeLoading,
          modesLoading,
          isNavigating,
          isTracking,
          liveLocation,
          locationError,
          navigation,
          destinationName,
          onClearRoute: handleClearRoute,
          onModeChange: handleModeChange,
          onStartNavigation: handleStartNavigation,
          onStopNavigation: handleStopNavigation,
        }
      : null;

    const signature = JSON.stringify(snapshot);

    if (signature !== lastDirectionsSnapshotRef.current) {
      lastDirectionsSnapshotRef.current = signature;
      onDirectionsChange(snapshot);
    }
  });

  // ============================================================
  // MAP LOCATION VALIDATION
  // ============================================================

  if (!location) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  const position = [latitude, longitude];

  const displayedUserLocation =
    isNavigating && isTracking && liveLocation
      ? liveLocation
      : userLocation;

  // ============================================================
  // MY LOCATION BUTTON HANDLER
  // ============================================================

  async function handleMyLocationClick(...args) {
    if (typeof onMyLocation === "function") {
      await onMyLocation(...args);
    }

    // Trigger the map animation even if coordinates haven't changed.
    setRecenterRequest((previous) => previous + 1);
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="position-relative w-100 h-100"
      style={{ minHeight: 400 }}
    >
      <MapContainer
        className="w-100 h-100 position-absolute top-0 start-0"
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        
        <RouteLayer
          route={activeRoute}
          progressMeters={navigation.progressMeters}
          isNavigating={isNavigating}
        />


        <NavigationCamera
          location={liveLocation}
          enabled={isNavigating && isTracking}
          cameraActionsRef={cameraActionsRef}
          onFollowingChange={setIsCameraFollowing}
        />

        <MapClickHandler
          onClose={handleClosePlaceCard}
          isSelectingSpot={isSelectingSpot}
          onSpotLocationSelect={onSpotLocationSelect}
        />

        <MapLocationController
          location={location}
          navigationActive={isNavigating || routeLoading}
          recenterRequest={recenterRequest}
          zoom={MY_LOCATION_ZOOM}
        />

        <DestinationFocusController destination={selectedDestination} />

        <ExternalPlaceDiscovery
          onPlacesChange={setExternalPlaces}
        />

        <MapControls
          onMyLocation={handleMyLocationClick}
        />

        {displayedUserLocation && (
          <UserLocationMarker
            location={displayedUserLocation}
            isNavigating={isNavigating && isTracking}
          />
        )}

        {spots.map((spot) => (
          <SpotMarker
            key={spot.id}
            spot={spot}
            onGetDirections={handleGetDirections}
            routeLoading={routeLoading}
          />
        ))}

        {externalPlaces.map((place) => (
          <ExternalPlaceMarker
            key={`${place.osm_type}-${place.osm_id}`}
            place={place}
            onPlaceClick={handleExternalPlaceClick}
          />
        ))}

        {selectedDestination && (
          <Marker
            position={[
              selectedDestination.latitude,
              selectedDestination.longitude,
            ]}
            icon={destinationIcon}
            zIndexOffset={900}
          >
            <Popup>{selectedDestination.name}</Popup>
          </Marker>
        )}

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
                const markerPosition = event.target.getLatLng();

                onSpotLocationSelect?.({
                  latitude: markerPosition.lat,
                  longitude: markerPosition.lng,
                });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -35]}>
              Drag to adjust your HiddenSpot location
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {isNavigating && isTracking && (
        <button
          type="button"
          className="btn btn-light position-absolute shadow d-flex align-items-center gap-2"
          style={{
            right: "24px",
            bottom: "110px",
            zIndex: 1200,
            borderRadius: "24px",
            padding: "10px 16px",
            border: "1px solid #dee2e6",
          }}
          onClick={() => cameraActionsRef.current?.recenter?.()}
          title="Resume automatic navigation following"
          aria-label="Recenter navigation"
        >
          <i className="bi bi-crosshair" aria-hidden="true" />
          <span className="fw-semibold">Recenter</span>
        </button>
      )}

      {isNavigating && isRerouting && (
        <div
          className="position-absolute top-0 start-50 translate-middle-x mt-3 alert alert-info shadow-sm d-flex align-items-center gap-2"
          style={{ zIndex: 1200 }}
          role="status"
        >
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span>Recalculating route...</span>
        </div>
      )}

      {isNavigating &&
        isOffRoute &&
        !isRerouting &&
        !rerouteError && (
          <div
            className="position-absolute top-0 start-50 translate-middle-x mt-3 alert alert-warning shadow-sm"
            style={{ zIndex: 1200 }}
            role="status"
          >
            <i className="bi bi-exclamation-triangle me-2" />
            Off route
            {Number.isFinite(distanceFromRoute)
              ? ` (${Math.round(distanceFromRoute)} m)`
              : ""}
            . Waiting to recalculate...
          </div>
        )}

      {isNavigating && rerouteError && (
        <div
          className="position-absolute top-0 start-50 translate-middle-x mt-3 alert alert-warning shadow-sm d-flex align-items-center gap-2"
          style={{ zIndex: 1200 }}
          role="alert"
        >
          <span>{rerouteError}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setRerouteError("")}
            aria-label="Dismiss rerouting error"
          />
        </div>
      )}

      {modesError && (activeRoute || routeLoading) && (
        <div
          className="position-absolute top-0 start-50 translate-middle-x mt-3 alert alert-warning shadow-sm"
          style={{ zIndex: 1200 }}
          role="alert"
        >
          Unable to load travel modes. Please try refreshing the page.
        </div>
      )}

      {routeError && (
        <div
          className="position-absolute bottom-0 start-50 translate-middle-x mb-5 alert alert-danger shadow d-flex align-items-center gap-3"
          style={{ zIndex: 1200 }}
          role="alert"
        >
          <span>{routeError}</span>

          {lastRouteAttemptRef.current && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm flex-shrink-0"
              onClick={handleRetryDirections}
              disabled={routeLoading}
            >
              Retry Directions
            </button>
          )}

          <button
            type="button"
            className="btn-close"
            onClick={() => setRouteError("")}
            aria-label="Dismiss error"
          />
        </div>
      )}

      {selectedExternalPlace && (
        <SelectedExternalPlaceCard
          key={`${selectedExternalPlace.osm_type}-${selectedExternalPlace.osm_id}`}
          place={selectedExternalPlace}
          onClose={handleClosePlaceCard}
          onGetDirections={handleGetDirections}
          routeLoading={routeLoading}
        />
      )}
    </div>
  );
}

export default NearSpotMap;