const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Better Auth user ID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String },
  bio: { type: String },
  website: { type: String },
  location: { type: String },
  skills: [{ type: String }],
  socialLinks: {
    github: { type: String },
    linkedin: { type: String },
    twitter: { type: String },
  },
  followers: [{ type: String }], // Store Better Auth user IDs
  following: [{ type: String }], // Store Better Auth user IDs
  preferences: {
    topics: [{ type: String }],
    darkMode: { type: Boolean, default: false },
  },
  stats: {
    postsCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userProfileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
