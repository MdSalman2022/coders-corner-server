import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";

dotenv.config();

const connectDB = (await import("./config/database.js")).default;
const userRoutes = (await import("./routes/userRoutes.js")).default;
const postRoutes = (await import("./routes/postRoutes.js")).default;
const commentRoutes = (await import("./routes/commentRoutes.js")).default;
const { generalLimiter } = await import("./middleware/rateLimit.js");
const { securityHeaders } = await import("./middleware/security.js");

const app = express();
const port = process.env.PORT || 5000;

// Connect to database FIRST
await connectDB();

// Initialize Better Auth after database connection
const { initializeAuth } = await import("./config/auth.js");
const auth = await initializeAuth();

console.log("✅ Database connection state:", mongoose.connection.readyState);
console.log("🗄️  Database name:", mongoose.connection.db.databaseName);

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
