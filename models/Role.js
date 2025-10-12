const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["user", "admin"], // Start with these two, easy to extend
    },
    displayName: {
      type: String,
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          "read",
          "write",
          "comment",
          "like",
          "admin",
          "moderate",
          "manage_users",
        ],
      },
    ],
    description: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance
roleSchema.index({ name: 1 });

module.exports = mongoose.model("Role", roleSchema);
