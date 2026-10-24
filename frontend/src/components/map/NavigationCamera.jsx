
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

const NAVIGATION_ZOOM = 18;
const CAMERA_ANIMATION_SECONDS = 0.5;
const GPS_ACCURACY_LIMIT_METERS = 100;

// Position the arrow at approximately 65%
// of the map's height, leaving more road visible ahead.
const ARROW_VERTICAL_POSITION = 0.65;

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

  const accuracy = Number(location.accuracy);

  if (
    location.accuracy != null &&
    (
      !Number.isFinite(accuracy) ||
      accuracy > GPS_ACCURACY_LIMIT_METERS
    )
  ) {
    return null;
  }

  return [latitude, longitude];
}

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

  locationRef.current = location;
  enabledRef.current = enabled;

  function updateFollowing(value) {
    if (followingRef.current === value) return;

    followingRef.current = value;
    onFollowingChange?.(value);
  }

  function clearCameraTimeout() {
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = null;
    }
  }

  function moveCamera(position, animate = true) {
    if (!position) return;

    clearCameraTimeout();

    const [latitude, longitude] = position;

    // Leaflet's project/unproject methods let us offset
    // the camera without moving the actual GPS marker.
    const targetZoom = NAVIGATION_ZOOM;

    const mapSize = map.getSize();

    const projected = map.project(
      L.latLng(latitude, longitude),
      targetZoom
    );

    const verticalOffset =
      mapSize.y * (ARROW_VERTICAL_POSITION - 0.5);

    const cameraCenter = map.unproject(
      projected.add([0, -verticalOffset]),
      targetZoom
    );

    programmaticMoveRef.current = true;

    map.stop();

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
    }, CAMERA_ANIMATION_SECONDS * 1000 + 150);
  }

  // Detect user interactions.
  useEffect(() => {
    if (!enabled) return;

    function pauseFollowing() {
      updateFollowing(false);
      clearCameraTimeout();
      programmaticMoveRef.current = false;
      map.stop();
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
  }, [map, enabled, onFollowingChange]);

  // Reset following when navigation starts or stops.
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
  }, [enabled, onFollowingChange]);

  // Expose recenter to NearSpotMap.
  useEffect(() => {
    if (!cameraActionsRef) return;

    cameraActionsRef.current = {
      recenter() {
        if (!enabledRef.current) return;

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
      cameraActionsRef.current = null;
    };
  }, [map, cameraActionsRef, onFollowingChange]);

  // Follow incoming GPS updates.
  useEffect(() => {
    if (!enabled || !followingRef.current) return;

    const position = getValidPosition(location);

    if (!position) return;

    const previous = lastPositionRef.current;

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
    map,
    enabled,
    location?.latitude,
    location?.longitude,
    location?.accuracy,
  ]);

  // Cleanup when component unmounts.
  useEffect(() => {
    return () => {
      clearCameraTimeout();
    };
  }, []);

  return null;
}
