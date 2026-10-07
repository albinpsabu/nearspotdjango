import {
  MapContainer,
  TileLayer,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import UserLocationMarker from "./UserLocationMarker";
import SpotMarker from "./SpotMarker";


function NearSpotMap({ location, spots }) {

  if (!location) {
    return null;
  }


  // =========================================================
  // MAP POSITION
  // =========================================================

  const position = [
    location.latitude,
    location.longitude,
  ];


  return (
    <>

      {/* =====================================================
          MAP STYLING
      ====================================================== */}

      <style>
        {`

          /* ================================================
             BRIGHT MAP
          ================================================= */

          .nearsport-map .leaflet-tile-pane {

            filter:
              brightness(0.98)
              contrast(1.03)
              saturate(0.95);

          }


          /* ================================================
             ZOOM CONTROLS
          ================================================= */

          .nearsport-map
          .leaflet-control-zoom {

            border:
              none !important;

            box-shadow:
              0 3px 12px
              rgba(0,0,0,0.15)
              !important;

          }


          .nearsport-map
          .leaflet-control-zoom a {

            position: fixed !important;

            right: 20px !important;
            bottom: 90px !important;

            left: auto !important;
            top: auto !important;

            border: none !important;

            box-shadow:
                0 3px 12px rgba(0, 0, 0, 0.15) !important;
          }


          .nearsport-map
          .leaflet-control-zoom a:hover {

            color:
              #10cda4 !important;

            background:
              #f7fffd !important;

          }


          /* ================================================
             ATTRIBUTION
          ================================================= */

          .nearsport-map
          .leaflet-control-attribution {

            background:
              rgba(255,255,255,0.85)
              !important;

            color:
              #687779
              !important;

          }


          .nearsport-map
          .leaflet-control-attribution a {

            color:
              #149d80
              !important;

          }


          /* ================================================
             POPUP
          ================================================= */

          .nearsport-map
          .leaflet-popup-content-wrapper {

            background:
              #ffffff
              !important;

            color:
              #172427
              !important;

            border:
              1px solid
              rgba(20,40,45,0.10)
              !important;

            box-shadow:
              0 8px 25px
              rgba(0,0,0,0.18)
              !important;

          }


          .nearsport-map
          .leaflet-popup-tip {

            background:
              #ffffff
              !important;

          }


          .nearsport-map
          .leaflet-popup-content {

            color:
              #172427
              !important;

          }


          .nearsport-map
          .leaflet-popup-close-button {

            color:
              #455558
              !important;

          }

        `}
      </style>


      {/* =====================================================
          MAP
      ====================================================== */}

      <MapContainer
        className="nearsport-map"
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={true}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100dvh",
          background: "#eef2f2",
        }}
      >

        {/* =================================================
            OPEN STREET MAP
        ================================================== */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {/* =================================================
            USER LOCATION
        ================================================== */}

        <UserLocationMarker
          location={location}
        />


        {/* =================================================
            HIDDEN SPOTS
        ================================================== */}

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


export default NearSpotMap;