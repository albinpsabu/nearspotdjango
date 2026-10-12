
import { Marker, Popup } from "react-leaflet";
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
    "></div>
  `,
  iconSize: [17, 17],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

// ============================================================
// FORMAT CATEGORY
// ============================================================

function formatCategory(category) {
  if (!category) {
    return "Place";
  }

  return category
    .split(":")
    .pop()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

// ============================================================
// EXTERNAL PLACE MARKER
// ============================================================

function ExternalPlaceMarker({ place, onPlaceClick }) {
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

  // ----------------------------------------------------------
  // HANDLE MARKER CLICK
  // ----------------------------------------------------------

  const handleMarkerClick = (event) => {
    // Prevent this click from also closing the place card
    // through the parent map's click handler.
    if (event.originalEvent) {
      L.DomEvent.stopPropagation(event.originalEvent);
    }

    if (typeof onPlaceClick === "function") {
      onPlaceClick(place);
    }
  };

  return (
    <Marker
      position={position}
      icon={externalPlaceIcon}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    >
      <Popup>
        <div
          style={{
            minWidth: "190px",
            maxWidth: "250px",
          }}
        >
          <strong
            style={{
              fontSize: "14px",
              color: "#263639",
            }}
          >
            {place.name}
          </strong>

          <p
            style={{
              margin: "7px 0 4px",
              fontSize: "12px",
              color: "#10a37f",
            }}
          >
            {formatCategory(place.category)}
          </p>

          {place.address && (
            <p
              style={{
                margin: "4px 0",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              {place.address}
            </p>
          )}

          <small
            style={{
              display: "block",
              marginTop: "8px",
              color: "#94a3b8",
            }}
          >
            Place data © OpenStreetMap contributors
          </small>
        </div>
      </Popup>
    </Marker>
  );
}

export default ExternalPlaceMarker;
