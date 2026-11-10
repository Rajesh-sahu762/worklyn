require('dotenv').config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const { setNotificationIo } = require("./services/notification.service");
const app = require("./app");
const port = process.env.PORT || 5000;
const connectDB = require("./config/db");

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://10.89.158.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!token || !secret) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.userId)
      .select("_id isDeleted deactivatedAt isVerified")
      .lean();

    if (!user || user.isDeleted || user.deactivatedAt || !user.isVerified) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = String(user._id);
    next();
  } catch {
    next(new Error("Invalid or expired access token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

// Existing notification creation calls now emit through this shared service.
setNotificationIo(io);

connectDB();

app.get("/", (req, res) => res.send("Hello World!"));

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
