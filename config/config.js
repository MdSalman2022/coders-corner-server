import dotenv from "dotenv";

dotenv.config();

// environment
const NODE_ENV = process.env.NODE_ENV;
const PORT = process.env.PORT;
const isLocal = NODE_ENV === "development" ? true : false;

const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const SERVER_URL = isLocal
  ? process.env.LOCAL_SERVER_URL
  : process.env.PROD_SERVER_URL;
const CLIENT_URL = isLocal
  ? process.env.LOCAL_FRONTEND_URL
  : process.env.PROD_FRONTEND_URL;

// auth
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// cloudinary
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

// gemini
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";

// cors
const CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://coders-corner-client.vercel.app",
].filter(Boolean);

// rate limit
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const GENERAL_RATE_LIMIT_WINDOW_MS = 1000;
const GENERAL_RATE_LIMIT_MAX_REQUESTS = 30;

// file config
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ========== Security Headers ==========
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// ========== Feature Flags ==========
const ENABLE_AI_FEATURES = process.env.ENABLE_AI_FEATURES;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// cache config
const CACHE_TTL = 60 * 5;
const ENABLE_CACHE = process.env.ENABLE_CACHE !== "false";

// post config
const POSTS_DEFAULT_LIMIT = 10;
const POSTS_ADMIN_LIMIT = 5;
const EXCERPT_LENGTH = 150;
const EXCERPT_PREVIEW_LENGTH = 100;
const READING_TIME_WORDS_PER_MINUTE = 200;
const AI_EXCERPT_MAX_LENGTH = 80;
const AI_EXCERPT_MAX_TOKENS = 150;
const AI_TIMEOUT_MS = 15000;
const GEMINI_MODEL = "gemini-2.5-flash-lite";

const GEMINI_TEMPERATURE = 0.7;
const GEMINI_TOP_P = 0.8;
const GEMINI_TOP_K = 40;
const GEMINI_CONTENT_PREVIEW_LENGTH = 400;

const USER_STATS_ADMIN_LIMIT = 5;
const USER_FEATURED_POSTS_LIMIT = 20;

export {
  NODE_ENV,
  PORT,
  MONGODB_URI,
  SERVER_URL,
  CLIENT_URL,
  BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  GOOGLE_GEMINI_API_KEY,
  CORS_ORIGINS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  GENERAL_RATE_LIMIT_WINDOW_MS,
  GENERAL_RATE_LIMIT_MAX_REQUESTS,
  MAX_FILE_SIZE,
  SECURITY_HEADERS,
  ENABLE_AI_FEATURES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  CACHE_TTL,
  ENABLE_CACHE,
  POSTS_DEFAULT_LIMIT,
  POSTS_ADMIN_LIMIT,
  EXCERPT_LENGTH,
  EXCERPT_PREVIEW_LENGTH,
  READING_TIME_WORDS_PER_MINUTE,
  AI_EXCERPT_MAX_LENGTH,
  AI_EXCERPT_MAX_TOKENS,
  AI_TIMEOUT_MS,
  GEMINI_MODEL,
  GEMINI_TEMPERATURE,
  GEMINI_TOP_P,
  GEMINI_TOP_K,
  GEMINI_CONTENT_PREVIEW_LENGTH,
  USER_STATS_ADMIN_LIMIT,
  USER_FEATURED_POSTS_LIMIT,
};
