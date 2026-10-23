
import { useCallback, useEffect, useRef, useState } from "react";

import { calculateRoute } from "../../services/navigation/navigationApi";

function getRouteError(error) {
  if (error?.code === 1) {
    return "Location permission was denied.";
  }

  if (error?.code === 2) {
    return "Your location is currently unavailable.";
  }

  if (error?.code === 3) {
    return "Getting your location timed out.";
  }

  const data = error?.response?.data;

  if (typeof data?.error === "string") return data.error;
  if (typeof data?.detail === "string") return data.detail;

  return error?.message || "Unable to calculate directions.";
}

export default function useRouteCalculation() {
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const requestIdRef = useRef(0);
  const controllerRef = useRef(null);
  const loadingRef = useRef(false);

  const clearRoute = useCallback(() => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    loadingRef.current = false;

    setActiveRoute(null);
    setRouteLoading(false);
    setRouteError("");
  }, []);

  const getDirections = useCallback(
    async (destination, travelMode = "driving") => {
      if (loadingRef.current) return false;

      const latitude = Number(destination?.latitude);
      const longitude = Number(destination?.longitude);

      if (
        destination?.latitude == null ||
        destination?.longitude == null ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      ) {
        setRouteError("Selected place has invalid coordinates.");
        return false;
      }

      const requestId = ++requestIdRef.current;
      const controller = new AbortController();

      controllerRef.current = controller;
      loadingRef.current = true;
      setRouteLoading(true);
      setRouteError("");

      try {
        if (!navigator.geolocation) {
          throw new Error(
            "Geolocation is not supported by this browser."
          );
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000,
            }
          );
        });

        if (requestId !== requestIdRef.current) return false;

        const route = await calculateRoute(
          {
            origin_latitude: position.coords.latitude,
            origin_longitude: position.coords.longitude,
            destination_latitude: latitude,
            destination_longitude: longitude,
            travel_mode: travelMode,
          },
          { signal: controller.signal }
        );

        if (requestId !== requestIdRef.current) return false;

        if (!route?.features?.length) {
          throw new Error(
            "No route was returned for this destination."
          );
        }

        setActiveRoute(route);
        setRouteError("");

        return true;
      } catch (error) {
        if (requestId !== requestIdRef.current) return false;

        if (error?.code === "ERR_CANCELED") return false;

        setRouteError(getRouteError(error));
        return false;
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          controllerRef.current = null;
          setRouteLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  return {
    activeRoute,
    routeLoading,
    routeError,
    setRouteError,
    getDirections,
    clearRoute,
  };
}
