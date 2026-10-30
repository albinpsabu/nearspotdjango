
import { useEffect, useMemo, useRef, useState } from "react";

import {
  extractRouteInstructions,
  formatNavigationDistance,
} from "../../utils/navigation/routeInstructions";

const EARTH_RADIUS_METERS = 6371000;
const MAX_GPS_ACCURACY_METERS = 50;
const MAX_GPS_AGE_MS = 15000;
const MAX_DISTANCE_FROM_ROUTE_METERS = 50;
const ARRIVAL_DISTANCE_METERS = 25;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

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

function findNearestRoutePosition(
  location,
  coordinates,
  minimumProgress = 0,
  cumulativeDistances = null
) {
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

    const progress = cumulativeDistances
      ? cumulativeDistances[index] +
        (cumulativeDistances[index + 1] -
          cumulativeDistances[index]) *
          fraction
      : 0;

    // Prefer plausible forward positions on crossing routes.
    const isBackward =
      cumulativeDistances &&
      progress < minimumProgress - 30;

    if (isBackward) {
      continue;
    }

    if (
      !nearest ||
      distance < nearest.distance ||
      (Math.abs(distance - nearest.distance) < 3 &&
        progress < nearest.progress)
    ) {
      nearest = {
        segmentIndex: index,
        fraction,
        distance,
        progress,
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

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--";
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder
    ? `${hours} hr ${remainder} min`
    : `${hours} hr`;
}

export default function useTurnByTurnNavigation({
  route,
  location,
  enabled = false,
}) {
  const [progressMeters, setProgressMeters] = useState(0);

  const [
    hasReliablePosition,
    setHasReliablePosition,
  ] = useState(false);

  const [hasArrived, setHasArrived] = useState(false);

  const lastProgressRef = useRef(0);
  const arrivedRef = useRef(false);

  const routeData = useMemo(() => {
    const coordinates =
      route?.features?.[0]?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const cumulativeDistances =
      buildCumulativeDistances(coordinates);

    const instructions = extractRouteInstructions(route);

    const totalDistance =
      cumulativeDistances[cumulativeDistances.length - 1];

    const durationFromSegments =
      route?.features?.[0]?.properties?.segments?.reduce(
        (sum, segment) => sum + (Number(segment.duration) || 0),
        0
      );

    const summaryDuration = Number(
      route?.features?.[0]?.properties?.summary?.duration
    );

    const totalDuration =
      Number.isFinite(summaryDuration) && summaryDuration > 0
        ? summaryDuration
        : durationFromSegments > 0
          ? durationFromSegments
          : null;

    return {
      coordinates,
      cumulativeDistances,
      instructions,
      totalDistance,
      totalDuration,
    };
  }, [route]);

  // Reset progress only when the route changes.
  // Temporary GPS interruptions do not reset progress.
  useEffect(() => {
    lastProgressRef.current = 0;
    arrivedRef.current = false;

    setProgressMeters(0);
    setHasReliablePosition(false);
    setHasArrived(false);
  }, [route]);

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  const accuracy =
    location?.accuracy == null
      ? NaN
      : Number(location.accuracy);

  const timestamp =
    location?.timestamp == null
      ? NaN
      : Number(location.timestamp);

  const isFreshPosition =
    enabled &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180 &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= MAX_GPS_ACCURACY_METERS &&
    Number.isFinite(timestamp) &&
    timestamp <= Date.now() &&
    Date.now() - timestamp <= MAX_GPS_AGE_MS;

  useEffect(() => {
    if (!isFreshPosition || !routeData) {
      setHasReliablePosition(false);
      return;
    }

    const nearest = findNearestRoutePosition(
      { latitude, longitude },
      routeData.coordinates,
      lastProgressRef.current,
      routeData.cumulativeDistances
    );

    if (
      !nearest ||
      nearest.distance > MAX_DISTANCE_FROM_ROUTE_METERS
    ) {
      setHasReliablePosition(false);
      return;
    }

    const nextProgress = Math.max(
      lastProgressRef.current,
      nearest.progress
    );

    lastProgressRef.current = nextProgress;

    setProgressMeters(nextProgress);
    setHasReliablePosition(true);

    const destination =
      routeData.coordinates[routeData.coordinates.length - 1];

    const destinationDistance = distanceBetweenCoordinates(
      [longitude, latitude],
      destination
    );

    if (
      !arrivedRef.current &&
      destinationDistance <= ARRIVAL_DISTANCE_METERS &&
      routeData.totalDistance - nextProgress <=
        Math.max(ARRIVAL_DISTANCE_METERS * 2, 50)
    ) {
      arrivedRef.current = true;
      setHasArrived(true);
    }
  }, [
    isFreshPosition,
    routeData,
    latitude,
    longitude,
    accuracy,
    timestamp,
  ]);

  return useMemo(() => {
    if (!routeData) {
      return {
        progressMeters: 0,
        currentInstruction: null,
        nextInstruction: null,
        distanceToNextTurn: null,
        distanceToNextTurnText: "--",
        remainingDistance: null,
        remainingDistanceText: "--",
        remainingDuration: null,
        remainingDurationText: "--",
        hasReliablePosition: false,
        hasArrived: false,
      };
    }

    const {
      instructions,
      cumulativeDistances,
      totalDistance,
      totalDuration,
    } = routeData;

    const nextInstructionIndex = instructions.findIndex(
      (instruction) => {
        const index = instruction.startWaypointIndex;

        return (
          Number.isInteger(index) &&
          Number.isFinite(cumulativeDistances[index]) &&
          cumulativeDistances[index] > progressMeters + 5
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

    const nextTurnPosition = nextInstruction
      ? cumulativeDistances[
          nextInstruction.startWaypointIndex
        ]
      : null;

    const distanceToNextTurn =
      Number.isFinite(nextTurnPosition)
        ? Math.max(0, nextTurnPosition - progressMeters)
        : null;

    const remainingDistance = Math.max(
      0,
      totalDistance - progressMeters
    );

    // ETA based on the remaining proportion of the original route.
    const remainingDuration =
      totalDuration == null || totalDistance <= 0
        ? null
        : totalDuration * (remainingDistance / totalDistance);

    return {
      progressMeters,
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

      remainingDuration,
      remainingDurationText:
        remainingDuration == null
          ? "--"
          : formatDuration(remainingDuration),

      hasReliablePosition:
        hasReliablePosition && isFreshPosition,

      hasArrived,
    };
  }, [
    routeData,
    progressMeters,
    hasReliablePosition,
    isFreshPosition,
    hasArrived,
  ]);
}
