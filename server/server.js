require("dotenv").config();
const http = require("http");
const app = require("./app");
const port = process.env.PORT || 5000;
const connectDB = require("./config/db");
const { initializeSocket } = require("./socket");

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});