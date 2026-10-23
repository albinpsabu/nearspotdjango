
import { useEffect, useState } from "react";

import { getTravelModes } from "../../services/navigation/navigationApi";

export default function useTravelModes() {
  const [modes, setModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTravelModes() {
      try {
        setLoading(true);
        setError(null);

        const data = await getTravelModes({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setModes(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTravelModes();

    return () => {
      controller.abort();
    };
  }, []);

  return {
    modes,
    loading,
    error,
  };
}
