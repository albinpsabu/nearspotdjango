
import { useEffect, useRef, useState } from "react";
import { getDistanceFromRoute } from "../../utils/navigation/geoUtils";

const OFF_ROUTE_THRESHOLD_METERS = 40;
const MAX_GPS_ACCURACY_METERS = 50;
const REQUIRED_CONSECUTIVE_UPDATES = 3;

export default function useRouteDeviation({
  location,
  route,
  enabled = false,
}) {
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [distanceFromRoute, setDistanceFromRoute] = useState(null);

  const consecutiveUpdatesRef = useRef(0);

  useEffect(() => {
    consecutiveUpdatesRef.current = 0;
    setIsOffRoute(false);
    setDistanceFromRoute(null);
  }, [route, enabled]);

  useEffect(() => {
    if (!enabled || !route || !location) {
      return;
    }

    const accuracy = Number(location.accuracy);

    // Ignore GPS readings with poor accuracy.
    if (
      !Number.isFinite(accuracy) ||
      accuracy > MAX_GPS_ACCURACY_METERS ||
      accuracy < 0
    ) {
      consecutiveUpdatesRef.current = 0;
      return;
    }

    const distance = getDistanceFromRoute(location, route);

    if (distance === null) {
      consecutiveUpdatesRef.current = 0;
      return;
    }

    setDistanceFromRoute(distance);

    if (distance > OFF_ROUTE_THRESHOLD_METERS) {
      consecutiveUpdatesRef.current += 1;
    } else {
      consecutiveUpdatesRef.current = 0;
      setIsOffRoute(false);
    }

    if (
      consecutiveUpdatesRef.current >=
      REQUIRED_CONSECUTIVE_UPDATES
    ) {
      setIsOffRoute(true);
    }
  }, [
    enabled,
    route,
    location?.latitude,
    location?.longitude,
    location?.accuracy,
    location?.timestamp,
  ]);

  return {
    isOffRoute,
    distanceFromRoute,
  };
}
