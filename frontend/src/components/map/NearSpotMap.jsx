import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import UserLocationMarker from "./UserLocationMarker";
import SpotMarker from "./SpotMarker";
import MapControls from "./MapControls";

// ============================================================
// MAP LOCATION CONTROLLER
// ============================================================

function MapLocationController({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      console.error(
        "Invalid location received by map:",
        location
      );

      return;
    }

    console.log(
      "Map moving to searched location:",
      latitude,
      longitude
    );

    // ========================================================
    // REFRESH LEAFLET MAP SIZE
    // ========================================================

    map.invalidateSize();

    // ========================================================
    // MOVE MAP TO SELECTED LOCATION
    // ========================================================

    map.flyTo(
      [latitude, longitude],
      15,
      {
        animate: true,
        duration: 1.2,
      }
    );
  }, [
    location?.latitude,
    location?.longitude,
    map,
  ]);

  return null;
}

// ============================================================
// NEARSPOT MAP
// ============================================================

function NearSpotMap({
  location,
  userLocation,
  spots,
  onMyLocation,
}) {
  if (!location) {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const position = [
    latitude,
    longitude,
  ];

  return (
    <>
      <style>
        {`
          .nearsport-map {
            width: 100%;
            height: 100%;
            z-index: 1;
          }

          .nearsport-map .leaflet-control-zoom {
            border: none;
            box-shadow: 0 8px 24px rgba(20, 40, 45, 0.14);
          }

          .nearsport-map .leaflet-control-zoom a {
            width: 36px;
            height: 36px;
            line-height: 36px;
            border: none;
            background: rgba(255, 255, 255, 0.96);
            color: #263639;
            font-size: 18px;
            font-weight: 700;
          }

          .nearsport-map .leaflet-control-zoom a:hover {
            background: #f2fbf8;
            color: #10cda4;
          }

          .nearsport-map .leaflet-control-attribution {
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(8px);
            border-radius: 8px 0 0 0;
            padding: 3px 7px;
            font-size: 9px;
          }
        `}
      </style>

      {/* ======================================================
          MAP
      ====================================================== */}

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

        {/* ====================================================
            OPENSTREETMAP TILES
        ==================================================== */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ====================================================
            SEARCHED LOCATION CONTROLLER
        ==================================================== */}

        <MapLocationController
          location={location}
        />

        {/* ====================================================
            CUSTOM MAP CONTROLS
        ==================================================== */}

        <MapControls
          onMyLocation={onMyLocation}
        />

        {/* ====================================================
            USER GPS LOCATION
        ==================================================== */}

        {userLocation && (
          <UserLocationMarker
            location={userLocation}
          />
        )}

        {/* ====================================================
            NEARBY APPROVED SPOTS
        ==================================================== */}

        {spots.map((spot) => (
          <SpotMarker
            key={spot.id}
            spot={spot}
          />
        ))}

      </MapContainer>
    </>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default NearSpotMap;