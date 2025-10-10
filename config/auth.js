import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

let authInstance = null;

export const initializeAuth = async () => {
  if (authInstance) {
    console.log("♻️  Reusing existing Better Auth instance");
    return authInstance;
  }

  // Wait for mongoose connection
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      "Database not connected. Call initializeAuth() after connectDB()"
    );
  }

  console.log("✅ Better Auth: Initializing with MongoDB connection");
  console.log("🗄️  Database name:", mongoose.connection.db?.databaseName);

  try {
    authInstance = betterAuth({
      database: mongodbAdapter(mongoose.connection.db, {
        client: mongoose.connection.getClient(),
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        minPasswordLength: 6,
        autoSignIn: true,
      },
      user: {
        additionalFields: {
          name: {
            type: "string",
            required: false,
          },
        },
      },
      baseURL: process.env.BASE_URL || "http://localhost:5000",
      secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      trustedOrigins: ["http://localhost:3000", "http://localhost:5000"],
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5, // 5 minutes
        },
      },
      advanced: {
        crossSubDomainCookies: {
          enabled: false, // Disable for localhost
        },
        disableCSRFCheck: true, // Disable for development
      },
    });

    console.log("✅ Better Auth initialized successfully!");
    console.log(
      "📍 Base URL:",
      process.env.BASE_URL || "http://localhost:5000"
    );

    return authInstance;
  } catch (error) {
    console.error("❌ Better Auth initialization failed:", error);
    throw error;
  }
};

export { authInstance };
