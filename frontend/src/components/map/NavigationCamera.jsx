import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function NavigationCamera({
  location,
  enabled,
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !location) return;

    const { latitude, longitude } = location;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.panTo([latitude, longitude], {
      animate: true,
      duration: 0.5,
    });
  }, [
    map,
    enabled,
    location?.latitude,
    location?.longitude,
  ]);

  return null;
}