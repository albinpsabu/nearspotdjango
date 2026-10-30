
import { useCallback, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const NAVIGATION_ZOOM = 18;
const CAMERA_ANIMATION_SECONDS = 0.5;
const GPS_ACCURACY_LIMIT_METERS = 100;

// Keep the user's arrow slightly below the center of the screen.
const ARROW_VERTICAL_POSITION = 0.65;

// ============================================================
// VALIDATE GPS POSITION
// ============================================================

function getValidPosition(location) {
  if (!location) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  if (location.accuracy != null) {
    const accuracy = Number(location.accuracy);

    if (
      !Number.isFinite(accuracy) ||
      accuracy <= 0 ||
      accuracy > GPS_ACCURACY_LIMIT_METERS
    ) {
      return null;
    }
  }

  return [latitude, longitude];
}

// ============================================================
// SAFELY CHECK MAP AVAILABILITY
// ============================================================

function isMapUsable(map) {
  try {
    if (!map || !map.getContainer) {
      return false;
    }

    const container = map.getContainer();

    if (!container || !container.isConnected) {
      return false;
    }

    const pane = map.getPane("mapPane");

    if (!pane || !pane.isConnected) {
      return false;
    }

    const position = pane._leaflet_pos;

    if (
      !position ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      return false;
    }

    const size = map.getSize();

    return size.x > 0 && size.y > 0;
  } catch {
    return false;
  }
}

// ============================================================
// NAVIGATION CAMERA
// ============================================================

export default function NavigationCamera({
  location,
  enabled = false,
  cameraActionsRef,
  onFollowingChange,
}) {
  const map = useMap();

  const followingRef = useRef(true);
  const wasEnabledRef = useRef(false);
  const lastPositionRef = useRef(null);

  const locationRef = useRef(location);
  const enabledRef = useRef(enabled);

  const programmaticMoveRef = useRef(false);
  const moveTimeoutRef = useRef(null);
  const mountedRef = useRef(false);

  locationRef.current = location;
  enabledRef.current = enabled;

  // ==========================================================
  // MOUNT STATUS
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ==========================================================
  // FOLLOWING STATE
  // ==========================================================

  const updateFollowing = useCallback(
    (value) => {
      if (followingRef.current === value) return;

      followingRef.current = value;
      onFollowingChange?.(value);
    },
    [onFollowingChange]
  );

  // ==========================================================
  // CLEAR CAMERA TIMEOUT
  // ==========================================================

  const clearCameraTimeout = useCallback(() => {
    if (moveTimeoutRef.current !== null) {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = null;
    }
  }, []);

  // ==========================================================
  // SAFELY STOP CAMERA ANIMATION
  // ==========================================================

  const safelyStopCamera = useCallback(() => {
    if (!mountedRef.current || !isMapUsable(map)) {
      return;
    }

    try {
      map.stop();
    } catch (error) {
      console.warn(
        "[NavigationCamera] Could not stop map animation:",
        error
      );
    }
  }, [map]);

  // ==========================================================
  // MOVE CAMERA
  // ==========================================================

  const moveCamera = useCallback(
    (position, animate = true) => {
      if (
        !mountedRef.current ||
        !position ||
        !isMapUsable(map)
      ) {
        return;
      }

      clearCameraTimeout();

      try {
        const [latitude, longitude] = position;
        const targetZoom = NAVIGATION_ZOOM;
        const mapSize = map.getSize();

        const projected = map.project(
          L.latLng(latitude, longitude),
          targetZoom
        );

        // Position the GPS marker slightly below screen center.
        const verticalOffset =
          mapSize.y * (ARROW_VERTICAL_POSITION - 0.5);

        const cameraCenter = map.unproject(
          projected.add([0, -verticalOffset]),
          targetZoom
        );

        programmaticMoveRef.current = true;

        // Stop any previous animation only while the map is usable.
        safelyStopCamera();

        // Recheck in case the map was detached during the operation.
        if (
          !mountedRef.current ||
          !isMapUsable(map)
        ) {
          programmaticMoveRef.current = false;
          return;
        }

        if (animate) {
          map.flyTo(cameraCenter, targetZoom, {
            animate: true,
            duration: CAMERA_ANIMATION_SECONDS,
          });
        } else {
          map.setView(cameraCenter, targetZoom, {
            animate: false,
          });
        }

        moveTimeoutRef.current = setTimeout(() => {
          programmaticMoveRef.current = false;
          moveTimeoutRef.current = null;
        }, animate ? CAMERA_ANIMATION_SECONDS * 1000 + 200 : 0);
      } catch (error) {
        programmaticMoveRef.current = false;

        console.warn(
          "[NavigationCamera] Camera movement failed:",
          error
        );
      }
    },
    [map, clearCameraTimeout, safelyStopCamera]
  );

  // ==========================================================
  // PAUSE FOLLOWING WHEN USER MOVES MAP
  // ==========================================================

  useEffect(() => {
    if (!enabled || !isMapUsable(map)) {
      return undefined;
    }

    function pauseFollowing() {
      updateFollowing(false);
      clearCameraTimeout();
      programmaticMoveRef.current = false;
      safelyStopCamera();
    }

    function handleZoomStart() {
      if (!programmaticMoveRef.current) {
        pauseFollowing();
      }
    }

    map.on("dragstart", pauseFollowing);
    map.on("boxzoomstart", pauseFollowing);
    map.on("zoomstart", handleZoomStart);

    return () => {
      map.off("dragstart", pauseFollowing);
      map.off("boxzoomstart", pauseFollowing);
      map.off("zoomstart", handleZoomStart);
    };
  }, [
    map,
    enabled,
    updateFollowing,
    clearCameraTimeout,
    safelyStopCamera,
  ]);

  // ==========================================================
  // RESET WHEN NAVIGATION STARTS OR STOPS
  // ==========================================================

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      followingRef.current = true;
      lastPositionRef.current = null;
      onFollowingChange?.(true);
    }

    if (!enabled) {
      followingRef.current = true;
      lastPositionRef.current = null;

      clearCameraTimeout();
      programmaticMoveRef.current = false;
    }

    wasEnabledRef.current = enabled;
  }, [
    enabled,
    onFollowingChange,
    clearCameraTimeout,
  ]);

  // ==========================================================
  // EXPOSE RECENTER ACTION
  // ==========================================================

  useEffect(() => {
    if (!cameraActionsRef) {
      return undefined;
    }

    cameraActionsRef.current = {
      recenter() {
        if (
          !enabledRef.current ||
          !mountedRef.current
        ) {
          return;
        }

        const position = getValidPosition(
          locationRef.current
        );

        if (!position) return;

        updateFollowing(true);
        lastPositionRef.current = position;
        moveCamera(position, true);
      },
    };

    return () => {
      if (cameraActionsRef.current) {
        cameraActionsRef.current = null;
      }
    };
  }, [
    cameraActionsRef,
    updateFollowing,
    moveCamera,
  ]);

  // ==========================================================
  // FOLLOW VALID GPS POSITIONS
  // ==========================================================

  useEffect(() => {
    if (
      !enabled ||
      !followingRef.current ||
      !mountedRef.current
    ) {
      return;
    }

    const position = getValidPosition(location);

    if (!position) return;

    const previous = lastPositionRef.current;

    // Do not restart animation for identical coordinates.
    if (
      previous &&
      previous[0] === position[0] &&
      previous[1] === position[1]
    ) {
      return;
    }

    lastPositionRef.current = position;
    moveCamera(position, true);
  }, [
    enabled,
    location?.latitude,
    location?.longitude,
    location?.accuracy,
    moveCamera,
  ]);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      clearCameraTimeout();

      // Do not call map.stop() during unmount.
      // Leaflet may already be removing its map pane.
      programmaticMoveRef.current = false;
    };
  }, [clearCameraTimeout]);

  return null;
}
