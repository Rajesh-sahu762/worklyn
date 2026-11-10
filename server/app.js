const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const organizationRoutes = require("./routes/organization.routes");
const projectRoutes = require("./routes/project.routes");
const issueRoutes = require("./routes/issue.routes");
const issueCommentRoutes = require("./routes/issueComment.routes");
const invitationRoutes = require("./routes/invitation.route");
const teamRoutes = require("./routes/team.routes");
const sprintRoutes = require("./routes/sprint.routes");
const notificationRoutes = require("./routes/notification.routes");
const reportRoutes = require("./routes/report.routes");
const profileRoutes = require("./routes/profile.routes");

const app = express();
const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:5173,http://10.89.158.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(cors({
  origin(origin, callback) {
    // Permit non-browser/server-to-server requests without an Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use("/api", issueRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api", projectRoutes);
app.use("/api", issueCommentRoutes);
app.use("/api", teamRoutes);
app.use("/api", sprintRoutes);
app.use("/api", notificationRoutes);
app.use("/api", reportRoutes);
app.use("/api", profileRoutes);

module.exports = app;