const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/user");

let io;

const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:5173,http://10.89.158.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Authenticate every socket handshake. Never accept a client-selected user room.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret || typeof token !== "string" || !token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (!decoded.userId) return next(new Error("Invalid access token"));

      const user = await User.findById(decoded.userId)
        .select("_id tokenVersion isDeleted deactivatedAt isVerified")
        .lean();

      if (
        !user ||
        user.isDeleted ||
        user.deactivatedAt ||
        !user.isVerified ||
        (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)
      ) {
        return next(new Error("Session is not valid"));
      }

      socket.data.userId = String(user._id);
      return next();
    } catch {
      return next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
    // Private server-controlled room. Clients cannot choose another user's room.
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
};

const getIO = () => io;

module.exports = { initializeSocket, getIO };