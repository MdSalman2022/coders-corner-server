import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { createRequire } from "module";
import http from "http";

const require = createRequire(import.meta.url);

dotenv.config();

const connectDB = (await import("./config/database.js")).default;
const userRoutes = (await import("./routes/userRoutes.js")).default;
const postRoutes = (await import("./routes/postRoutes.js")).default;
const commentRoutes = (await import("./routes/commentRoutes.js")).default;
const uploadRoutes = (await import("./routes/uploadRoutes.js")).default;
const adminRoutes = (await import("./routes/admin.js")).default;
const authRoutes = (await import("./routes/auth.js")).default;
const bookmarkRoutes = (await import("./routes/bookmarkRoutes.js")).default;
const statsRoutes = (await import("./routes/statsRoutes.js")).default;

// Import CommonJS modules
const feedRoutes = require("./routes/feedRoutes.js");
const systemStatsRoutes = require("./routes/systemStatsRoutes.js");
const outboxWorker = require("./workers/outboxWorker.js");
const { initializeSocketio } = require("./config/socket.js");

const { generalLimiter } = await import("./middleware/rateLimit.js");
const { securityHeaders } = await import("./middleware/security.js");

const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 5000;

// Connect to database FIRST
await connectDB();

// Initialize Better Auth after database connection
const { initializeAuth } = await import("./config/auth.js");
const auth = await initializeAuth();

console.log("✅ Database connection state:", mongoose.connection.readyState);
console.log("🗄️  Database name:", mongoose.connection.db.databaseName);

// Initialize Socket.io
const io = initializeSocketio(httpServer);

// CORS configuration - MUST come before Better Auth
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cookie",
    ],
  })
);

// Express middleware - MUST come after CORS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Better Auth handler - Mount AFTER express json/urlencoded middleware
app.use("/api/auth", toNodeHandler(auth));

app.use(generalLimiter);
app.use(securityHeaders);

// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", authRoutes); // Changed from /api/auth to avoid conflict
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/feed", feedRoutes); // ✅ Hybrid push-pull feed routes
app.use("/api/system", systemStatsRoutes); // ✅ System monitoring routes

// Start Outbox Worker (processes fanout events)
outboxWorker.start();

// Health check
app.get("/", (req, res) => {
  res.send("Coders Corner API is running");
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    message: "Better Auth API is running",
    mongodbConnected: mongoose.connection.readyState === 1,
    authConfigured: !!auth,
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

httpServer.listen(port, () => {
  console.log(`\n🚀 Coders Corner server running on port ${port}`);
  console.log(`📡 Socket.io server active on ws://localhost:${port}`);
  console.log(`\n✅ Hybrid Push-Pull Feed System Ready\n`);
});
