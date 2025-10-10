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

  console.log("🔧 Better Auth: Environment variables loaded:");
  console.log(
    "  GOOGLE_CLIENT_ID:",
    process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  GITHUB_CLIENT_ID:",
    process.env.GITHUB_CLIENT_ID ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  BETTER_AUTH_SECRET:",
    process.env.BETTER_AUTH_SECRET ? "✅ Set" : "❌ Missing"
  );

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
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID || "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        },
        github: {
          clientId: process.env.GITHUB_CLIENT_ID || "",
          clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        },
      },
      user: {
        additionalFields: {
          name: {
            type: "string",
            required: false,
          },
          avatar: {
            type: "string",
            required: false,
          },
          bio: {
            type: "string",
            required: false,
          },
          website: {
            type: "string",
            required: false,
          },
          location: {
            type: "string",
            required: false,
          },
          skills: {
            type: "string[]",
            required: false,
          },
          socialLinks: {
            type: "object",
            required: false,
            properties: {
              github: { type: "string" },
              linkedin: { type: "string" },
              twitter: { type: "string" },
            },
          },
          followers: {
            type: "string[]",
            required: false,
          },
          following: {
            type: "string[]",
            required: false,
          },
          preferences: {
            type: "object",
            required: false,
            properties: {
              topics: { type: "string[]" },
              darkMode: { type: "boolean" },
            },
          },
          stats: {
            type: "object",
            required: false,
            properties: {
              postsCount: { type: "number" },
              followersCount: { type: "number" },
              followingCount: { type: "number" },
            },
          },
        },
      },
      baseURL: process.env.BASE_URL || "http://localhost:5000",
      secret:
        process.env.BETTER_AUTH_SECRET ||
        "your-secret-key-change-in-production",
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
        defaultRedirectURL: process.env.FRONTEND_URL || "http://localhost:3000",
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
