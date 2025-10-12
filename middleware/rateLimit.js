const rateLimit = require("express-rate-limit");

const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many posts created, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { createPostLimiter, generalLimiter };
