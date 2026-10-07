import {
  Circle,
  CircleMarker,
  Pane,
  Popup,
} from "react-leaflet";

function UserLocationMarker({ location }) {
  if (!location) {
    return null;
  }

  const position = [
    location.latitude,
    location.longitude,
  ];

  return (
    <>
      <Circle
        center={position}
        radius={location.accuracy}
        pathOptions={{
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.08,
          weight: 1,
        }}
      />

      <Pane
        name="user-location"
        style={{
          zIndex: 1000,
        }}
      >
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
            <br />
            Accuracy: {Math.round(location.accuracy)} meters
          </Popup>
        </CircleMarker>
      </Pane>
    </>
  );
}

export default UserLocationMarker;