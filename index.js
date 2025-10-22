const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { toNodeHandler } = require("better-auth/node");

dotenv.config();

const connectDB = require("./config/database.js");
const userRoutes = require("./routes/userRoutes.js");
const postRoutes = require("./routes/postRoutes.js");
const commentRoutes = require("./routes/commentRoutes.js");
const uploadRoutes = require("./routes/uploadRoutes.js");
const adminRoutes = require("./routes/admin.js");
const authRoutes = require("./routes/auth.js");
const bookmarkRoutes = require("./routes/bookmarkRoutes.js");
const statsRoutes = require("./routes/statsRoutes.js");
const { generalLimiter } = require("./middleware/rateLimit.js");
const { securityHeaders } = require("./middleware/security.js");

const app = express();
const port = process.env.PORT || 5000;

(async () => {
  try {
    // Connect to database FIRST
    await connectDB();

    // Initialize Better Auth after database connection
    const { initializeAuth } = await import("./config/auth.js");
    const auth = await initializeAuth();

    console.log(
      "✅ Database connection state:",
      mongoose.connection.readyState
    );
    console.log("🗄️  Database name:", mongoose.connection.db.databaseName);

    // CORS configuration
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

    // Better Auth handler - Mount as middleware
    app.use("/api/auth", toNodeHandler(auth));

    // Express middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

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

    app.listen(port, () => {
      console.log(`Coders Corner server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
