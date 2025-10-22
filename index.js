import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";

dotenv.config();

import connectDB from "./config/database.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { securityHeaders } from "./middleware/security.js";
import { initializeAuth } from "./config/auth.js";

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();

    const auth = await initializeAuth();

    console.log(
      "✅ Database connection state:",
      mongoose.connection.readyState
    );
    console.log("🗄️  Database name:", mongoose.connection.db.databaseName);

    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:5000",
          "https://coders-corner-client.vercel.app",
        ],
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

    app.use("/api/auth", toNodeHandler(auth));

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

    app.use(generalLimiter);
    app.use(securityHeaders);

    app.use("/api/users", userRoutes);
    app.use("/api/posts", postRoutes);
    app.use("/api/comments", commentRoutes);
    app.use("/api/uploads", uploadRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/user", authRoutes);
    app.use("/api/bookmarks", bookmarkRoutes);
    app.use("/api/stats", statsRoutes);

    app.get("/", (req, res) => {
      res.send("Coders Corner API is running");
    });

    app.get("/test", (req, res) => {
      res.json({
        message: "Better Auth API is running",
        mongodbConnected: mongoose.connection.readyState === 1,
        authConfigured: !!auth,
        timestamp: new Date().toISOString(),
      });
    });

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
