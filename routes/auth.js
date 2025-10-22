import express from "express";
const router = express.Router();
import User from "../models/User.js";

router.post("/me", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findOne({ betterAuthId: userId })
      .populate("role", "name displayName permissions")
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        ...user.toObject(),
        roleName: user.role?.name || user.roleName || "user",
        id: user.betterAuthId,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
