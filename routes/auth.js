const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Role = require("../models/Role");

// Get current user data (for auth context)
router.post("/me", async (req, res) => {
  try {
    // Get userId from request body (passed from frontend)
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Find user and populate role to get roleName
    let user = await User.findOne({ betterAuthId: userId })
      .populate("role", "name displayName permissions")
      .select("-password"); // Exclude sensitive fields if any

    if (!user) {
      console.log(`⚠️  User profile not found for ${userId}`);
      console.log(`💡 Please call /api/user/sync-profile to create profile`);
      
      // Don't auto-create here - let sync-profile handle it
      // because we need the email from the request
      return res.status(404).json({ 
        message: "User profile not found. Please sync profile first.",
        needsSync: true,
      });
    }

    // Return user with roleName
    res.json({
      user: {
        ...user.toObject(),
        roleName: user.role?.name || user.roleName || "user", // Fallback
        id: user.betterAuthId, // Better Auth ID
        _id: user._id.toString(), // MongoDB ObjectId (needed for followers comparison)
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Sync user profile (called after signup)
router.post("/sync-profile", async (req, res) => {
  try {
    const { userId, email, name, image } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user already exists
    let user = await User.findOne({ betterAuthId: userId });

    if (!user) {
      // Get default user role
      let userRole = await Role.findOne({ name: "user" });
      
      if (!userRole) {
        userRole = new Role({
          name: "user",
          displayName: "User",
          permissions: ["read:posts", "create:posts", "update:own", "delete:own"],
        });
        await userRole.save();
      }

      // Create new user profile
      user = new User({
        betterAuthId: userId,
        name: name || "User",
        email: email || "",
        avatar: image || null,
        bio: null,
        website: null,
        location: null,
        skills: [],
        socialLinks: {
          github: null,
          linkedin: null,
          twitter: null,
        },
        followers: [],
        following: [],
        preferences: {
          topics: [],
          darkMode: false,
        },
        stats: {
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
        },
        roleName: "user",
        role: userRole._id,
      });

      await user.save();
      console.log(`✅ Sync: Created user profile for ${email} (${userId})`);
    } else {
      // Update existing user with provided data
      if (name) user.name = name;
      if (email) user.email = email;
      if (image) user.avatar = image;
      
      await user.save();
      console.log(`✅ Sync: Updated user profile for ${email}`);
    }

    res.json({
      message: "User profile synced",
      user: {
        ...user.toObject(),
        id: user.betterAuthId,
        _id: user._id.toString(), // Include MongoDB ObjectId
      },
    });
  } catch (error) {
    console.error("Sync profile error:", error);
    res.status(500).json({ message: "Failed to sync profile", error: error.message });
  }
});

module.exports = router;
