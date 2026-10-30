
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://127.0.0.1:8000/ws/spots/";

const API_URL = "http://127.0.0.1:8000/api/spots";

function normalizeNotification(notification) {
  return {
    ...notification,
    type: notification.notification_type || notification.type,
    read: notification.is_read ?? notification.read ?? false,
    receivedAt:
      notification.created_at ||
      notification.receivedAt ||
      new Date().toISOString(),
  };
}

export default function useNotifications() {
  const { accessToken, isAuthenticated } = useAuth();

  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] =
    useState("disconnected");
  const [error, setError] = useState(null);

  // Load saved notifications from Django.
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setNotifications([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/notifications/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Could not load notifications (${response.status}).`
        );
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.results || [];

      setNotifications(items.map(normalizeNotification));
      setError(null);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Could not load notifications.");
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Maintain the real-time WebSocket connection.
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current = null;
      setConnectionStatus("disconnected");
      return;
    }

    let cancelled = false;
    let socket;

    try {
      socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      console.log("[WS] Created:", socket.url, socket.readyState);

      setConnectionStatus("connecting");
      setError(null);
    } catch (err) {
      console.error("[WS] Could not create socket:", err);
      setConnectionStatus("disconnected");
      setError("Could not create the notification connection.");
      return;
    }

    socket.onopen = () => {
      console.log("[WS] Opened; cancelled:", cancelled);

      if (cancelled || socketRef.current !== socket) return;

      try {
        socket.send(
          JSON.stringify({
            type: "authenticate",
            token: accessToken,
          })
        );
      } catch (err) {
        console.error("[WS] Failed to send authentication:", err);
        setError("Could not authenticate the notification connection.");
      }
    };

    socket.onmessage = (event) => {
      if (cancelled || socketRef.current !== socket) return;

      try {
        const message = JSON.parse(event.data);

        if (message.type === "authentication.required") {
          return;
        }

        if (message.type === "authentication.success") {
          setConnectionStatus("connected");
          setError(null);
          console.log("[WS] Authentication successful.");
          return;
        }

        if (
          message.type === "spot.pending" ||
          message.type === "spot.approved" ||
          message.type === "spot.rejected"
        ) {
          const incoming = normalizeNotification({
            ...message.data,
            type: message.type,
            is_read: false,
          });

          setNotifications((previous) => {
            const alreadyExists = previous.some(
              (item) =>
                item.id === incoming.id &&
                typeof incoming.id === "number"
            );

            if (alreadyExists) return previous;

            return [incoming, ...previous];
          });

          return;
        }

        if (message.type === "authentication.failed") {
          setError("WebSocket authentication failed.");
          socket.close(4001, "Authentication failed");
        }
      } catch (err) {
        console.error("[WS] Invalid WebSocket message:", err);
      }
    };

    socket.onerror = (event) => {
      console.error("[WS] Error event:", event);

      if (!cancelled && socketRef.current === socket) {
        setError("Notification connection encountered an error.");
      }
    };

    socket.onclose = (event) => {
      console.log("[WS] Closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        cancelled,
      });

      if (!cancelled && socketRef.current === socket) {
        setConnectionStatus("disconnected");
      }
    };

    return () => {
      cancelled = true;

      // Remove handlers before closing so this cleanup doesn't
      // trigger state updates from an obsolete connection.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        console.log(
          "[WS] Cleanup closing socket; readyState:",
          socket.readyState
        );
        socket.close();
      }

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [accessToken, isAuthenticated]);

  // Persist a read-status change in Django.
  const markAsRead = useCallback(
    async (id) => {
      const notification = notifications.find(
        (item) => item.id === id
      );

      if (!notification || notification.read) return;

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );

      try {
        const response = await fetch(
          `${API_URL}/notifications/${id}/read/`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Could not mark notification as read.");
        }
      } catch (err) {
        console.error(err);
        await fetchNotifications();
      }
    },
    [accessToken, notifications, fetchNotifications]
  );

  // Persist marking every notification as read.
  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;

    setNotifications((previous) =>
      previous.map((item) => ({ ...item, read: true }))
    );

    try {
      const response = await fetch(
        `${API_URL}/notifications/read-all/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Could not mark all notifications as read.");
      }
    } catch (err) {
      console.error(err);
      setNotifications(previousNotifications);
    }
  }, [accessToken, notifications]);

  // Clear the local list only; database records are preserved.
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  return {
    notifications,
    unreadCount,
    connectionStatus,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshNotifications: fetchNotifications,
  };
}
