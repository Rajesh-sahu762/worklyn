const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const organizationRoutes = require("./routes/organization.routes");
const projectRoutes = require("./routes/project.routes");
const issueRoutes = require("./routes/issue.routes");
const issueCommentRoutes = require("./routes/issueComment.routes");
const app = express();
const invitationRoutes = require("./routes/invitation.route");
app.use(express.json());
app.use(cookieParser());


app.use("/api", issueRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api", projectRoutes);
app.use("/api", issueCommentRoutes);
module.exports = app;
