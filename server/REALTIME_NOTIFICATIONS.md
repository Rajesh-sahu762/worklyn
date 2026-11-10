# Worklyn Real-Time Notifications (Socket.IO)

## What changed

- The Express app now runs on a Node HTTP server shared with Socket.IO.
- Socket handshakes authenticate the in-memory access JWT using the same access-token secret and token-version checks as the REST API.
- The server puts each authenticated connection in a private `user:<userId>` room. The client cannot select a room or subscribe to another user's notifications.
- The existing notification service saves notifications to MongoDB first, then emits `notification:new` to each recipient's private room.
- The React notification provider connects after authentication, receives live events, and maintains the unread badge count.
- The existing inbox inserts incoming notifications without requiring a refresh. REST endpoints remain the source of truth for history and read state.

## Environment

Set `CLIENT_URLS` in the server environment to the exact browser origins, comma-separated:

```env
CLIENT_URLS=http://localhost:5173,http://10.89.158.1:5173
```

For a deployed frontend, add its exact HTTPS origin. Do not add trailing paths such as `/api`. `FRONTEND_URL` remains supported as a single-origin fallback.

The frontend's existing `VITE_API_URL` must contain the backend origin only (for example `http://localhost:5000`), not the `/api` suffix. If it is unset, the client uses the current hostname on port 5000.

## Event flow

1. User A creates/updates an issue or comments.
2. The existing service creates a Notification document for User B.
3. After MongoDB confirms the insert, the notification service populates safe display fields and emits `notification:new`.
4. Socket.IO routes the event to `user:<User B ID>`.
5. User B's React provider updates the unread count and the inbox displays the new notification.

If User B is offline, no socket event is queued. The notification is still stored in MongoDB and appears when the inbox loads again.

## Important Socket.IO concepts

- **HTTP**: request/response; the browser asks and the server replies.
- **WebSocket**: a persistent two-way connection for messages in either direction.
- **Socket.IO**: a real-time library built on top of WebSocket where available, with fallback transport, reconnection, events and rooms.
- **Handshake**: the initial connection request. Worklyn sends the access token in `socket.handshake.auth.token`.
- **Middleware**: `io.use()` runs before a socket connects; it verifies the JWT and loads the current user state.
- **Room**: a server-managed group of sockets. Worklyn uses `user:<id>` so all tabs/devices of one user receive the event.
- **Emit**: `socket.emit()` or `io.to(room).emit()` sends an event.
- **Listen**: `socket.on()` registers a handler for an event.

## Install dependencies after pulling

Run in both folders:

```powershell
cd server
npm install

cd ..\client
npm install
```

This regenerates each package-lock file for the newly added Socket.IO dependencies.

## Manual test

1. Start MongoDB and the backend.
2. Start the frontend and sign in as User B in one browser.
3. Sign in as User A in another browser/profile.
4. Have User A assign an issue to User B or comment on an issue where User B is reporter/assignee.
5. User B should see the navbar unread badge update and the notification appear in the inbox without refreshing.
6. Mark it read; the badge should decrement. Refresh User B's page and confirm the read state remains correct.
7. Sign out User B; the socket should disconnect. A logged-out or expired token must not establish a socket connection.

## Current limitations / production notes

- Live events are best-effort. MongoDB persistence and REST reads are the recovery mechanism.
- This is a single-process Socket.IO setup. Multiple backend instances need a shared Socket.IO adapter (commonly Redis) so rooms/events work across instances.
- There is no offline event queue, delivery acknowledgement, or push notification in this implementation.
- Keep CORS origins explicit in production and use HTTPS/WSS.
- Never trust a user ID or room name supplied by the browser.
