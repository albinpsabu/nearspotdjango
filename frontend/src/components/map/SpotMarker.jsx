import { Marker, Popup } from "react-leaflet";

function SpotMarker({ spot }) {
  if (
    spot.latitude === null ||
    spot.longitude === null ||
    spot.latitude === undefined ||
    spot.longitude === undefined
  ) {
    return null;
  }

  const position = [
    Number(spot.latitude),
    Number(spot.longitude),
  ];

  const distance =
    spot.distance_meters !== undefined &&
    spot.distance_meters !== null
      ? spot.distance_meters < 1000
        ? `${Math.round(spot.distance_meters)} m away`
        : `${(spot.distance_meters / 1000).toFixed(1)} km away`
      : "";

  return (
    <Marker position={position}>
      <Popup>
        <div>
          <strong>{spot.name}</strong>

          {spot.description && (
            <p>{spot.description}</p>
          )}

          {distance && (
            <p>{distance}</p>
          )}

          {spot.status && (
            <small>
              Status: {spot.status}
            </small>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default SpotMarker;