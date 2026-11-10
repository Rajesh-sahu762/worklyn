/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getNotifications } from "../lib/api";

const NotificationsContext = createContext(null);
const API_ORIGIN =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const EMPTY_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};
const idOf = (notification) => notification?._id ?? notification?.id;

export function NotificationsProvider({ children }) {
  const { status, accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [initialized, setInitialized] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const receivedIds = useRef(new Set());
  const eventsSinceSync = useRef([]);
  const readIds = useRef(new Set());

  const addNotification = useCallback((notification) => {
    const id = idOf(notification);
    if (!id || receivedIds.current.has(String(id))) return;

    receivedIds.current.add(String(id));
    eventsSinceSync.current.push(notification);
    setItems((current) => [
      notification,
      ...current.filter((item) => String(idOf(item)) !== String(id)),
    ].slice(0, 50));
    setLatestNotification(notification);
    setUnreadCount((count) => count + 1);
    setPagination((current) => ({ ...current, total: current.total + 1 }));
  }, []);

  const syncRead = useCallback((notificationId) => {
    const id = String(notificationId);
    if (readIds.current.has(id)) return;
    readIds.current.add(id);
    setItems((current) => current.map((item) =>
      String(idOf(item)) === id
        ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
        : item
    ));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const refreshNotifications = useCallback(async () => {
    const eventOffset = eventsSinceSync.current.length;
    try {
      const result = await getNotifications(1, 20);
      const resultIds = new Set(result.notifications.map((item) => String(idOf(item))));
      const liveDuringRequest = eventsSinceSync.current.slice(eventOffset)
        .filter((item) => !resultIds.has(String(idOf(item))) && !item.readAt);

      setItems((current) => {
        const merged = [
          ...current.filter((item) => !resultIds.has(String(idOf(item)))),
          ...result.notifications,
        ];
        return merged
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50);
      });
      setUnreadCount(result.unreadCount + liveDuringRequest.length);
      setPagination(result.pagination ?? EMPTY_PAGINATION);
      setNotificationError("");

      // Events already represented by the REST snapshot are counted by the API.
      // Retain only events created during this request but absent from its snapshot.
      eventsSinceSync.current = liveDuringRequest;
      result.notifications.forEach((item) => receivedIds.current.add(String(idOf(item))));
      return result;
    } catch (error) {
      setNotificationError(error.message || "Couldn't load notifications.");
      throw error;
    }
  }, []);

  useEffect(() => {
    receivedIds.current.clear();
    eventsSinceSync.current = [];
    readIds.current.clear();

    if (status !== "authenticated" || !accessToken) {
      setItems([]);
      setUnreadCount(0);
      setLatestNotification(null);
      setPagination(EMPTY_PAGINATION);
      setNotificationError("");
      setInitialized(status !== "loading");
      return undefined;
    }

    let active = true;
    setInitialized(false);
    setNotificationError("");

    const socket = io(API_ORIGIN, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on("notification:new", (notification) => {
      if (active) addNotification(notification);
    });

    socket.on("connect_error", (error) => {
      if (import.meta.env.DEV) {
        console.warn("Worklyn live notifications unavailable:", error.message);
      }
    });

    refreshNotifications()
      .catch(() => {})
      .finally(() => {
        if (active) setInitialized(true);
      });

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [status, accessToken, addNotification, refreshNotifications]);

  const value = useMemo(() => ({
    items,
    setItems,
    unreadCount,
    latestNotification,
    pagination,
    setPagination,
    initialized,
    notificationError,
    addNotification,
    syncRead,
    refreshNotifications,
  }), [
    items,
    unreadCount,
    latestNotification,
    pagination,
    initialized,
    notificationError,
    addNotification,
    syncRead,
    refreshNotifications,
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside <NotificationsProvider>");
  }
  return context;
}
