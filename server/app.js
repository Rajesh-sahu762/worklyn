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

var corsOptions = {
  origin: ['http://localhost:5173', 'http://10.89.158.1:5173'],
  credentials: true, // Allow cookies to be sent with requests
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

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
