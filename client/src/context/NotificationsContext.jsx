/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
const sortNewestFirst = (items) =>
  [...items].sort((a, b) => {
    const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return dateDiff || String(idOf(b)).localeCompare(String(idOf(a)));
  });

export function NotificationsProvider({ children }) {
  const { status, accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [initialized, setInitialized] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  // Socket events can arrive while an HTTP snapshot is in flight. Keep their
  // IDs so REST and Socket.IO never count the same notification twice.
  const receivedIds = useRef(new Set());
  const pendingLive = useRef(new Map());
  const readIds = useRef(new Set());
  const unreadIds = useRef(new Set());
  const refreshSequence = useRef(0);

  const addNotification = useCallback((notification) => {
    const id = idOf(notification);
    if (!id) return;

    const key = String(id);
    if (receivedIds.current.has(key)) return;

    receivedIds.current.add(key);
    pendingLive.current.set(key, notification);
    if (!notification.readAt && !readIds.current.has(key)) unreadIds.current.add(key);

    setItems((current) =>
      sortNewestFirst([
        notification,
        ...current.filter((item) => String(idOf(item)) !== key),
      ]).slice(0, 50),
    );
    setLatestNotification(notification);
    setUnreadCount((count) => count + (unreadIds.current.has(key) ? 1 : 0));
    setPagination((current) => ({ ...current, total: current.total + 1 }));
  }, []);

  const syncRead = useCallback((notificationId) => {
    const key = String(notificationId);
    if (readIds.current.has(key)) return;

    readIds.current.add(key);
    pendingLive.current.delete(key);
    const wasUnread = unreadIds.current.delete(key);

    setItems((current) =>
      current.map((item) =>
        String(idOf(item)) === key
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item,
      ),
    );
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const refreshNotifications = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const result = await getNotifications(1, 20);
      const snapshot = result.notifications ?? [];
      if (sequence !== refreshSequence.current) return result;

      const snapshotIds = new Set(snapshot.map((item) => String(idOf(item))));
      const pendingNotInSnapshot = [...pendingLive.current.entries()]
        .filter(([id, item]) =>
          !snapshotIds.has(id) &&
          !item.readAt &&
          !readIds.current.has(id),
        );

      // The REST unread count includes every notification committed before its
      // query snapshot. Socket events absent from that snapshot are added once.
      const snapshotUnread = snapshot.filter(
        (item) => !item.readAt && !readIds.current.has(String(idOf(item))),
      ).length;
      const serverUnreadOutsidePage = Math.max(0, result.unreadCount - snapshotUnread);
      const correctedUnread =
        serverUnreadOutsidePage +
        snapshot.filter(
          (item) => !item.readAt && !readIds.current.has(String(idOf(item))),
        ).length +
        pendingNotInSnapshot.length;

      setItems((current) => {
        const merged = new Map();
        current.forEach((item) => merged.set(String(idOf(item)), item));
        snapshot.forEach((item) => merged.set(String(idOf(item)), item));
        pendingNotInSnapshot.forEach(([id, item]) => merged.set(id, item));

        return sortNewestFirst([...merged.values()])
          .map((item) =>
            readIds.current.has(String(idOf(item))) && !item.readAt
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          )
          .slice(0, 50);
      });

      // Drop events represented in the server snapshot; retain events that
      // arrived after it or are not yet visible in the first page.
      for (const item of snapshot) {
        const key = String(idOf(item));
        receivedIds.current.add(key);
        pendingLive.current.delete(key);
        if (item.readAt || readIds.current.has(key)) unreadIds.current.delete(key);
        else unreadIds.current.add(key);
      }
      pendingNotInSnapshot.forEach(([id]) => {
        if (!readIds.current.has(id)) unreadIds.current.add(id);
      });

      setUnreadCount(correctedUnread);
      setPagination({
        ...(result.pagination ?? EMPTY_PAGINATION),
        total:
          (result.pagination?.total ?? snapshot.length) +
          pendingNotInSnapshot.length,
      });
      setNotificationError("");
      return result;
    } catch (error) {
      setNotificationError(error.message || "Couldn't load notifications.");
      throw error;
    }
  }, []);

  useEffect(() => {
    receivedIds.current.clear();
    pendingLive.current.clear();
    readIds.current.clear();
    unreadIds.current.clear();
    refreshSequence.current += 1;

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
    let refreshOnConnect = false;
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

    const hydrate = () => {
      if (!active) return;
      refreshNotifications()
        .catch(() => {})
        .finally(() => {
          if (active) setInitialized(true);
        });
    };

    socket.on("connect", () => {
      // A reconnect can happen after notifications were created while this
      // client was offline. Reconcile from the persisted inbox.
      if (refreshOnConnect) hydrate();
      refreshOnConnect = true;
    });

    socket.on("notification:new", (notification) => {
      if (active) addNotification(notification);
    });

    socket.on("connect_error", (error) => {
      if (import.meta.env.DEV) {
        console.warn("Worklyn live notifications unavailable:", error.message);
      }
    });

    hydrate();

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [status, accessToken, addNotification, refreshNotifications]);

  const value = useMemo(
    () => ({
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
    }),
    [
      items,
      unreadCount,
      latestNotification,
      pagination,
      initialized,
      notificationError,
      addNotification,
      syncRead,
      refreshNotifications,
    ],
  );

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
