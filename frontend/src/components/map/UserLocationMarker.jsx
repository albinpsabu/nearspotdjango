
import { useEffect, useRef, useState } from "react";
import {
  Circle,
  CircleMarker,
  Marker,
  Pane,
  Popup,
} from "react-leaflet";
import L from "leaflet";

const MIN_MOVEMENT_METERS = 3;

function calculateBearing(start, end) {
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;

  const deltaLongitude =
    ((end.longitude - start.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLongitude) * Math.cos(lat2);

  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(deltaLongitude);

  return (
    ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  );
}

function calculateDistance(start, end) {
  const earthRadius = 6371000;

  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;

  const deltaLat = lat2 - lat1;
  const deltaLon =
    ((end.longitude - start.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function createNavigationIcon(heading) {
  return L.divIcon({
    className: "bg-transparent border-0",
    html: `
      <div
        style="
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
        "
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="#2563eb"
            fill-opacity="0.13"
          />

          <path
            d="M24 5 L38 39 L24 32 L10 39 Z"
            fill="#2563eb"
            stroke="#ffffff"
            stroke-width="3"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

export default function UserLocationMarker({
  location,
  isNavigating = false,
}) {
  const [heading, setHeading] = useState(0);
  const previousLocationRef = useRef(null);

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  const hasValidLocation =
    location != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  useEffect(() => {
    if (!isNavigating || !hasValidLocation) {
      previousLocationRef.current = null;
      return;
    }

    const current = { latitude, longitude };
    const previous = previousLocationRef.current;

    const gpsHeading = Number(location?.heading);

    if (
      location?.heading != null &&
      Number.isFinite(gpsHeading) &&
      gpsHeading >= 0 &&
      gpsHeading < 360
    ) {
      setHeading(gpsHeading);
      previousLocationRef.current = current;
      return;
    }

    if (previous) {
      const distance = calculateDistance(
        previous,
        current
      );

      if (distance >= MIN_MOVEMENT_METERS) {
        setHeading(calculateBearing(previous, current));
        previousLocationRef.current = current;
      }
    } else {
      previousLocationRef.current = current;
    }
  }, [
    isNavigating,
    hasValidLocation,
    latitude,
    longitude,
    location?.heading,
  ]);

  if (!hasValidLocation) {
    return null;
  }

  const position = [latitude, longitude];

  const accuracy = Number(location?.accuracy);

  const validAccuracy =
    Number.isFinite(accuracy) && accuracy > 0
      ? accuracy
      : null;

  return (
    <>
      {validAccuracy !== null && (
        <Circle
          center={position}
          radius={validAccuracy}
          pathOptions={{
            color: isNavigating ? "#2563eb" : "#22c55e",
            fillColor: isNavigating
              ? "#2563eb"
              : "#22c55e",
            fillOpacity: 0.08,
            weight: 1,
          }}
        />
      )}

      <Pane
        name="user-location"
        style={{ zIndex: 1000 }}
      >
        {isNavigating ? (
          <Marker
            position={position}
            icon={createNavigationIcon(heading)}
            zIndexOffset={1000}
          >
            <Popup>
              <strong>Live Navigation</strong>
              <div>
                Direction: {Math.round(heading)}°
              </div>
              <div>
                Accuracy:{" "}
                {validAccuracy !== null
                  ? `${Math.round(validAccuracy)} meters`
                  : "Unknown"}
              </div>
            </Popup>
          </Marker>
        ) : (
          <CircleMarker
            center={position}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#22c55e",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <strong>Your Location</strong>
              <div>
                Accuracy:{" "}
                {validAccuracy !== null
                  ? `${Math.round(validAccuracy)} meters`
                  : "Unknown"}
              </div>
            </Popup>
          </CircleMarker>
        )}
      </Pane>
    </>
  );
}
