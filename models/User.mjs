import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  betterAuthId: { type: String, required: true, unique: true },
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

const User =
  mongoose.models.User || mongoose.model("User", userSchema, "userinfo");
export default User;
