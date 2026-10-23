
import { useEffect, useMemo, useRef, useState } from "react";

import {
  extractRouteInstructions,
  formatNavigationDistance,
} from "../../utils/navigation/routeInstructions";

const EARTH_RADIUS_METERS = 6371000;
const MAX_GPS_ACCURACY_METERS = 50;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Project route coordinates onto a local plane
 * centred on the user's GPS position.
 */
function projectPoint(coordinate, reference) {
  const latitude = toRadians(reference.latitude);

  return {
    x:
      EARTH_RADIUS_METERS *
      toRadians(coordinate[0] - reference.longitude) *
      Math.cos(latitude),

    y:
      EARTH_RADIUS_METERS *
      toRadians(coordinate[1] - reference.latitude),
  };
}

/**
 * Find the nearest position on the route polyline.
 *
 * Returns:
 * - segmentIndex: nearest route segment
 * - fraction: progress along that segment
 * - distance: distance from GPS to route
 */
function findNearestRoutePosition(location, coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  let nearest = null;

  for (let index = 0; index < coordinates.length - 1; index++) {
    const start = coordinates[index];
    const end = coordinates[index + 1];

    if (
      !Array.isArray(start) ||
      !Array.isArray(end) ||
      ![...start.slice(0, 2), ...end.slice(0, 2)].every(
        Number.isFinite
      )
    ) {
      continue;
    }

    const a = projectPoint(start, location);
    const b = projectPoint(end, location);

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;

    const fraction =
      lengthSquared > 0
        ? Math.max(
            0,
            Math.min(
              1,
              -(a.x * dx + a.y * dy) / lengthSquared
            )
          )
        : 0;

    const distance = Math.hypot(
      a.x + fraction * dx,
      a.y + fraction * dy
    );

    if (!nearest || distance < nearest.distance) {
      nearest = {
        segmentIndex: index,
        fraction,
        distance,
      };
    }
  }

  return nearest;
}

function distanceBetweenCoordinates(start, end) {
  const latitude1 = toRadians(start[1]);
  const latitude2 = toRadians(end[1]);
  const deltaLatitude = latitude2 - latitude1;
  const deltaLongitude = toRadians(end[0] - start[0]);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
  );
}

function buildCumulativeDistances(coordinates) {
  const distances = [0];

  for (let index = 1; index < coordinates.length; index++) {
    distances.push(
      distances[index - 1] +
        distanceBetweenCoordinates(
          coordinates[index - 1],
          coordinates[index]
        )
    );
  }

  return distances;
}

/**
 * Track upcoming navigation instructions
 * using progress along the route geometry.
 */
export default function useTurnByTurnNavigation({
  route,
  location,
  enabled = false,
}) {
  const [progressMeters, setProgressMeters] = useState(0);
  const [hasReliablePosition, setHasReliablePosition] =
    useState(false);

  const lastProgressRef = useRef(0);

  const routeData = useMemo(() => {
    const coordinates =
      route?.features?.[0]?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const cumulativeDistances =
      buildCumulativeDistances(coordinates);

    return {
      coordinates,
      cumulativeDistances,
      instructions: extractRouteInstructions(route),
      totalDistance:
        cumulativeDistances[cumulativeDistances.length - 1],
    };
  }, [route]);

  useEffect(() => {
    lastProgressRef.current = 0;
    setProgressMeters(0);
    setHasReliablePosition(false);
  }, [route, enabled]);

  useEffect(() => {
    if (!enabled || !routeData || !location) {
      return;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const accuracy = Number(location.accuracy);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > MAX_GPS_ACCURACY_METERS
    ) {
      return;
    }

    const nearest = findNearestRoutePosition(
      { latitude, longitude },
      routeData.coordinates
    );

    if (!nearest || nearest.distance > 50) {
      return;
    }

    const { cumulativeDistances } = routeData;

    const segmentLength =
      cumulativeDistances[nearest.segmentIndex + 1] -
      cumulativeDistances[nearest.segmentIndex];

    const calculatedProgress =
      cumulativeDistances[nearest.segmentIndex] +
      segmentLength * nearest.fraction;

    // Avoid moving backwards due to minor GPS fluctuations.
    const nextProgress = Math.max(
      lastProgressRef.current,
      calculatedProgress
    );

    lastProgressRef.current = nextProgress;
    setProgressMeters(nextProgress);
    setHasReliablePosition(true);
  }, [
    enabled,
    routeData,
    location?.latitude,
    location?.longitude,
    location?.accuracy,
    location?.timestamp,
  ]);

  const navigation = useMemo(() => {
    if (!routeData || routeData.instructions.length === 0) {
      return {
        currentInstruction: null,
        nextInstruction: null,
        distanceToNextTurn: null,
        remainingDistance: null,
        remainingDistanceText: "--",
        hasReliablePosition,
      };
    }

    const {
      instructions,
      cumulativeDistances,
      totalDistance,
    } = routeData;

    const nextInstructionIndex = instructions.findIndex(
      (instruction) => {
        const index = instruction.startWaypointIndex;

        return (
          cumulativeDistances[index] >
          progressMeters + 5
        );
      }
    );

    const upcomingIndex =
      nextInstructionIndex === -1
        ? instructions.length - 1
        : nextInstructionIndex;

    const currentInstruction =
      instructions[Math.max(0, upcomingIndex - 1)] || null;

    const nextInstruction =
      instructions[upcomingIndex] || null;

    const nextTurnPosition =
      nextInstruction
        ? cumulativeDistances[
            nextInstruction.startWaypointIndex
          ]
        : null;

    const distanceToNextTurn =
      nextTurnPosition == null
        ? null
        : Math.max(0, nextTurnPosition - progressMeters);

    const remainingDistance = Math.max(
      0,
      totalDistance - progressMeters
    );

    return {
      currentInstruction,
      nextInstruction,
      distanceToNextTurn,
      distanceToNextTurnText:
        distanceToNextTurn == null
          ? "--"
          : formatNavigationDistance(distanceToNextTurn),
      remainingDistance,
      remainingDistanceText:
        formatNavigationDistance(remainingDistance),
      hasReliablePosition,
    };
  }, [routeData, progressMeters, hasReliablePosition]);

  return navigation;
}
