
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const WS_URL = import.meta.env.VITE_WS_URL;

export default function useSpotWebSocket(onNotification) {
  const { accessToken, isAuthenticated } = useAuth();

  const socketRef = useRef(null);
  const callbackRef = useRef(onNotification);

  const [status, setStatus] = useState("disconnected");

  // Keep the latest callback without reconnecting the socket.
  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !WS_URL) {
      setStatus("disconnected");
      return;
    }

    let socket;
    let reconnectTimer;
    let manuallyClosed = false;
    let authenticated = false;
    let retryDelay = 1000;

    const connect = () => {
      if (manuallyClosed) return;

      setStatus("connecting");

      socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        // The consumer requires first-message JWT authentication.
        socket.send(
          JSON.stringify({
            type: "authenticate",
            token: accessToken,
          })
        );
      };

      socket.onmessage = (event) => {
        let message;

        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === "authentication.required") {
          return;
        }

        if (message.type === "authentication.success") {
          authenticated = true;
          retryDelay = 1000;
          setStatus("connected");
          return;
        }

        if (
          message.type === "spot.approved" ||
          message.type === "spot.rejected" ||
          message.type === "spot.pending" ||
          message.type === "notification"
        ) {
          callbackRef.current?.(message);
          return;
        }

        // Ignore the echo response and other non-notification events.
        if (message.type === "echo") {
          return;
        }

        // Pass other server events to the caller if needed.
        callbackRef.current?.(message);
      };

      socket.onerror = () => {
        // The close handler manages reconnection.
        setStatus("disconnected");
      };

      socket.onclose = (event) => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        authenticated = false;
        setStatus("disconnected");

        // Invalid or expired authentication needs a fresh token.
        if (event.code === 4401 || manuallyClosed) {
          return;
        }

        reconnectTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };
    };

    connect();

    return () => {
      manuallyClosed = true;
      clearTimeout(reconnectTimer);

      if (socket) {
        socket.close(1000, "Component unmounted");
      }

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setStatus("disconnected");
    };
  }, [accessToken, isAuthenticated]);

  return {
    status,
    isConnected: status === "connected",
  };
}
