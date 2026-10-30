
import { useEffect, useMemo } from "react";
import { GeoJSON, useMap } from "react-leaflet";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// GeoJSON coordinates use [longitude, latitude].
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

function interpolateCoordinate(start, end, fraction) {
  return [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction,
  ];
}

function getRemainingCoordinates(coordinates, progressMeters) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return coordinates || [];
  }

  if (!Number.isFinite(progressMeters) || progressMeters <= 0) {
    return coordinates;
  }

  const cumulativeDistances = [0];

  for (let index = 1; index < coordinates.length; index++) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1] +
        distanceBetweenCoordinates(
          coordinates[index - 1],
          coordinates[index]
        )
    );
  }

  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1];

  if (progressMeters >= totalDistance) {
    return [coordinates[coordinates.length - 1]];
  }

  for (let index = 0; index < coordinates.length - 1; index++) {
    const segmentStartDistance = cumulativeDistances[index];
    const segmentEndDistance = cumulativeDistances[index + 1];

    if (progressMeters > segmentEndDistance) {
      continue;
    }

    const segmentLength =
      segmentEndDistance - segmentStartDistance;

    const fraction =
      segmentLength > 0
        ? Math.max(
            0,
            Math.min(
              1,
              (progressMeters - segmentStartDistance) /
                segmentLength
            )
          )
        : 0;

    const currentCoordinate = interpolateCoordinate(
      coordinates[index],
      coordinates[index + 1],
      fraction
    );

    return [
      currentCoordinate,
      ...coordinates.slice(index + 1),
    ];
  }

  return [coordinates[coordinates.length - 1]];
}

function RouteBounds({ route }) {
  const map = useMap();

  useEffect(() => {
    const coordinates =
      route?.features?.[0]?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return;
    }

    const bounds = coordinates
      .filter(
        (coordinate) =>
          Array.isArray(coordinate) &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1])
      )
      .map(([longitude, latitude]) => [latitude, longitude]);

    if (bounds.length === 0) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
    });
  }, [route, map]);

  return null;
}

export default function RouteLayer({
  route,
  progressMeters = 0,
  isNavigating = false,
}) {
  const displayRoute = useMemo(() => {
    if (!route?.features?.length) {
      return null;
    }

    const feature = route.features[0];
    const geometry = feature?.geometry;
    const coordinates = geometry?.coordinates;

    if (
      geometry?.type !== "LineString" ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) {
      return route;
    }

    const displayCoordinates = isNavigating
      ? getRemainingCoordinates(coordinates, progressMeters)
      : coordinates;

    if (displayCoordinates.length < 2) {
      return null;
    }

    return {
      ...route,
      features: [
        {
          ...feature,
          geometry: {
            ...geometry,
            coordinates: displayCoordinates,
          },
        },
        ...route.features.slice(1),
      ],
    };
  }, [route, progressMeters, isNavigating]);

  if (!displayRoute?.features?.length) {
    return null;
  }

  return (
    <>
      <GeoJSON
        key={`${isNavigating ? "remaining" : "full"}-${JSON.stringify(
          displayRoute.features[0].geometry
        )}`}
        data={displayRoute}
        style={{
          color: "#2563eb",
          weight: 6,
          opacity: 0.9,
        }}
      />

      {!isNavigating && <RouteBounds route={route} />}
    </>
  );
}
