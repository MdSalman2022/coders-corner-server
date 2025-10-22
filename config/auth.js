import mongoose from "mongoose";
import {
  BETTER_AUTH_SECRET,
  SERVER_URL,
  CLIENT_URL,
  CORS_ORIGINS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from "./config.js";

let authInstance = null;

export const initializeAuth = async () => {
  if (authInstance) {
    console.log("♻️  Reusing existing Better Auth instance");
    return authInstance;
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database not connected.");
  }
  try {
    const { betterAuth } = await import("better-auth");
    const { mongodbAdapter } = await import("better-auth/adapters/mongodb");

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
          clientId: GOOGLE_CLIENT_ID || "",
          clientSecret: GOOGLE_CLIENT_SECRET || "",
        },
        github: {
          clientId: GITHUB_CLIENT_ID || "",
          clientSecret: GITHUB_CLIENT_SECRET || "",
        },
      },

      user: {
        additionalFields: {
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
      baseURL: SERVER_URL,
      secret: BETTER_AUTH_SECRET,
      trustedOrigins: CORS_ORIGINS,
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 60 * 60 * 24 * 7,
        },
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
      },
      advanced: {
        crossSubDomainCookies: {
          enabled: false,
        },
        disableCSRFCheck: true,
        defaultRedirectURL: CLIENT_URL,

        sessionRefresh: {
          enabled: true,
          interval: 60 * 60 * 1000,
        },
      },
    });

    console.log("✅ Better Auth initialized successfully!");
    console.log("✅ User profiles handled via Better Auth additionalFields");
    console.log("📍 Base URL:", SERVER_URL);
    console.log("📍 Client URL:", CLIENT_URL);

    return authInstance;
  } catch (error) {
    console.error("❌ Better Auth initialization failed:", error);
    throw error;
  }
};

export { authInstance };
