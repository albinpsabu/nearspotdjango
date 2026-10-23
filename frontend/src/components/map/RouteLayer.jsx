import { useEffect } from "react";
import { GeoJSON, useMap } from "react-leaflet";

// Keep the whole route visible after a successful routing request.
// openrouteservice GeoJSON uses [longitude, latitude], while Leaflet
// fitBounds expects [latitude, longitude].
function RouteBounds({ route }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = route?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) return;

    const bounds = coordinates.map(([longitude, latitude]) => [
      latitude,
      longitude,
    ]);

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
    });
  }, [route, map]);

  return null;
}

export default function RouteLayer({ route }) {
  if (!route?.features?.length) return null;

  return (
    <>
      {/* React Leaflet handles GeoJSON coordinate order automatically. */}
      <GeoJSON
        key={JSON.stringify(route.features[0].geometry)}
        data={route}
        style={{ color: "#2563eb", weight: 6, opacity: 0.9 }}
      />
      <RouteBounds route={route} />
    </>
  );
}
