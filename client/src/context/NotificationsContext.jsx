/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getUnreadNotificationCount } from "../lib/api";

const NotificationsContext = createContext(null);
const API_ORIGIN = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export function NotificationsProvider({ children }) {
  const { status, accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      setUnreadCount(0);
      setLatestNotification(null);
      return undefined;
    }

    let active = true;
    const socket = io(API_ORIGIN, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    getUnreadNotificationCount().then((count) => {
      if (active && !receivedSocketEvent.current) setUnreadCount(count);
    }).catch(() => {});

    socket.on("notification:new", (notification) => {
      if (!active || !notification?._id) return;
      receivedSocketEvent.current = true;\n      setLatestNotification(notification);
      setUnreadCount((count) => count + 1);
    });

    socket.on("connect_error", (error) => {
      if (import.meta.env.DEV) console.warn("Worklyn live notifications unavailable:", error.message);
    });

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [status, accessToken]);

  const value = useMemo(() => ({ unreadCount, setUnreadCount, latestNotification }), [unreadCount, latestNotification]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return context;
}