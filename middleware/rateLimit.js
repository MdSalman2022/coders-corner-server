import rateLimit from "express-rate-limit";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  GENERAL_RATE_LIMIT_WINDOW_MS,
  GENERAL_RATE_LIMIT_MAX_REQUESTS,
} from "../config/config.js";

const createPostLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: "Too many posts created, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const generalLimiter = rateLimit({
  windowMs: GENERAL_RATE_LIMIT_WINDOW_MS,
  max: GENERAL_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export { createPostLimiter, generalLimiter };
