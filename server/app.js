const cors = require("cors");   
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const organizationRoutes = require("./routes/organization.routes");
const projectRoutes = require("./routes/project.routes");
const issueRoutes = require("./routes/issue.routes");
const issueCommentRoutes = require("./routes/issueComment.routes");
const invitationRoutes = require("./routes/invitation.route");
const app = express();

var corsOptions = {
  origin: 'http://localhost:5173',
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
module.exports = app;
