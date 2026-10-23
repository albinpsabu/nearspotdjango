
import { Marker } from "react-leaflet";
import L from "leaflet";

// ============================================================
// EXTERNAL PLACE MARKER ICON
// ============================================================

const externalPlaceIcon = L.divIcon({
  className: "nearsport-external-marker",

  html: `
    <div style="
      width: 13px;
      height: 13px;
      background: #10b981;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      cursor: pointer;
    "></div>
  `,

  iconSize: [17, 17],
  iconAnchor: [8, 8],
});

// ============================================================
// EXTERNAL PLACE MARKER
// ============================================================

function ExternalPlaceMarker({ place, onPlaceClick }) {
  // ==========================================================
  // VALIDATE PLACE
  // ==========================================================

  if (!place) {
    return null;
  }

  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const position = [latitude, longitude];

  // ==========================================================
  // HANDLE MARKER CLICK
  // ==========================================================

  function handleMarkerClick() {
    console.log(
      "MARKER CLICKED:",
      place.name,
      place
    );

    if (typeof onPlaceClick === "function") {
      onPlaceClick(place);
    } else {
      console.error(
        "ExternalPlaceMarker: onPlaceClick is missing."
      );
    }
  }

  // ==========================================================
  // RENDER MARKER
  // ==========================================================

  return (
    <Marker
      position={position}
      icon={externalPlaceIcon}
      bubblingMouseEvents={false}
      eventHandlers={{
        click: handleMarkerClick,
      }}
      title={place.name || "Open place details"}
      keyboard={true}
      riseOnHover={true}
    />
  );
}

export default ExternalPlaceMarker;
