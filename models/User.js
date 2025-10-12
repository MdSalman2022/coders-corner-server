const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  betterAuthId: { type: String, required: true, unique: true }, // Better Auth user ID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String },
  bio: { type: String },
  website: { type: String },
  location: { type: String },
  position: { type: String }, // Job position/title
  education: { type: String }, // Education background
  work: { type: String }, // Current work/organization
  skills: [{ type: String }],
  socialLinks: {
    github: { type: String },
    linkedin: { type: String },
    twitter: { type: String },
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  }, // Role-based access control
  roleName: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  }, // Cached for performance
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Prevent model overwrite error
const User =
  mongoose.models.User || mongoose.model("User", userSchema, "userinfo");
module.exports = User;
