
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://127.0.0.1:8000/ws/spots/";

const API_URL ="http://127.0.0.1:8000/api/spots";

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
      const response = await fetch(
        `${API_URL}/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Could not load notifications (${response.status}).`
        );
      }

      const data = await response.json();

      // Django REST Framework pagination may return { results: [...] }.
      const items = Array.isArray(data) ? data : data.results || [];

      setNotifications(
        items.map(normalizeNotification)
      );
      setError(null);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Could not load notifications.");
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Maintain the existing real-time WebSocket connection.
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setConnectionStatus("disconnected");
      return;
    }

    let socket;
    let cancelled = false;

    try {
      socket = new WebSocket(WS_URL);
      socketRef.current = socket;
      setConnectionStatus("connecting");
      setError(null);
    } catch {
      setConnectionStatus("disconnected");
      setError("Could not create the notification connection.");
      return;
    }

    socket.onopen = () => {
      if (cancelled) return;

      socket.send(
        JSON.stringify({
          type: "authenticate",
          token: accessToken,
        })
      );
    };

    socket.onmessage = (event) => {
      if (cancelled) return;

      try {
        const message = JSON.parse(event.data);

        if (message.type === "authentication.required") {
          return;
        }

        if (message.type === "authentication.success") {
          setConnectionStatus("connected");
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

          // The WebSocket event may arrive just before or after
          // the REST API response. Avoid adding the same notification twice.
          setNotifications((previous) => {
            const alreadyExists = previous.some(
              (item) =>
                item.id === incoming.id &&
                typeof incoming.id === "number"
            );

            if (alreadyExists) {
              return previous;
            }

            return [incoming, ...previous];
          });

          return;
        }

        if (message.type === "authentication.failed") {
          setError("WebSocket authentication failed.");
          socket.close();
        }
      } catch (err) {
        console.error("Invalid WebSocket message:", err);
      }
    };

    socket.onerror = () => {
      if (!cancelled) {
        setError("Notification connection encountered an error.");
      }
    };

    socket.onclose = () => {
      if (!cancelled) {
        setConnectionStatus("disconnected");
      }
    };

    return () => {
      cancelled = true;

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
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

      // Optimistic UI update.
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

  // Clear the local list only. This does not delete database records.
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
