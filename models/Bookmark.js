const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can't bookmark the same post twice
bookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
