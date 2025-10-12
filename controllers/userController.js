const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const createUserProfile = async (req, res) => {
  try {
    const {
      betterAuthId,
      name,
      email,
      avatar,
      bio,
      website,
      location,
      skills,
      socialLinks,
      followers,
      following,
      preferences,
      stats,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ betterAuthId });
    if (existingUser) {
      return res.status(409).json({ message: "User profile already exists" });
    }

    const newUser = new User({
      betterAuthId,
      name,
      email,
      avatar,
      bio,
      website,
      location,
      skills: skills || [],
      socialLinks: socialLinks || {
        github: null,
        linkedin: null,
        twitter: null,
      },
      followers: followers || [],
      following: following || [],
      preferences: preferences || {
        topics: [],
        darkMode: false,
      },
      stats: stats || {
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      },
    });

    await newUser.save();
    console.log(
      `✅ Created user profile for: ${newUser.email} (${newUser._id})`
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error("❌ Error creating user profile:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  console.log("req.params", req.params);
  try {
    const { id } = req.params;
    let user;
    // Look up by Better Auth ID
    console.log(`🔍 Looking up user by Better Auth ID: ${id}`);
    user = await User.findOne({ betterAuthId: id });

    if (!user) {
      console.log(`🔄 Attempting to create profile from Better Auth data...`);

      try {
        // Get user from Better Auth collection
        const db = mongoose.connection.db;
        const betterAuthUser = await db.collection("user").findOne({ id });

        if (betterAuthUser) {
          // Create User profile
          user = new User({
            betterAuthId: betterAuthUser.id,
            name: betterAuthUser.name || "User",
            email: betterAuthUser.email,
            avatar: betterAuthUser.image || null,
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
          });

          await user.save();
          console.log(`✅ Created User profile for: ${user.email}`);
        } else {
          return res
            .status(404)
            .json({ message: "User not found in Better Auth" });
        }
      } catch (syncError) {
        console.error("❌ Error syncing user from Better Auth:", syncError);
        return res.status(404).json({ message: "User not found" });
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.body; // Better Auth user ID from frontend
    const updates = req.body;

    // Remove userId from updates to avoid conflicts
    delete updates.userId;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find user by Better Auth ID
    const user = await User.findOne({ betterAuthId: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Allowed fields for update
    const allowedFields = [
      "name",
      "bio",
      "website",
      "location",
      "skills",
      "socialLinks",
      "preferences",
    ];

    // Filter updates to only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Update user
    Object.assign(user, filteredUpdates);
    user.updatedAt = new Date();

    await user.save();

    console.log(`✅ Updated profile for: ${user.email}`);

    res.json({
      message: "Profile updated successfully",
      user: {
        userId: user.betterAuthId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        location: user.location,
        skills: user.skills,
        socialLinks: user.socialLinks,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    res.status(500).json({ message: error.message });
  }
};

const followUser = async (req, res) => {
  try {
    const targetBetterAuthId = req.params.id;
    // TODO: Get current user ID from Better Auth session
    const currentBetterAuthId = req.body.betterAuthId || "placeholder"; // This needs proper implementation

    const targetUser = await User.findOne({ betterAuthId: targetBetterAuthId });
    const currentUser = await User.findOne({
      betterAuthId: currentBetterAuthId,
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.following.includes(targetUser._id)) {
      return res.status(400).json({ message: "Already following" });
    }

    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);

    currentUser.stats.followingCount = currentUser.following.length;
    targetUser.stats.followersCount = targetUser.followers.length;

    await currentUser.save();
    await targetUser.save();

    // Create notification
    const notification = new Notification({
      recipient: targetUser._id,
      sender: currentUser._id,
      type: "follow",
      message: `${currentUser.name} started following you`,
    });
    await notification.save();

    res.json({ message: "Followed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const targetBetterAuthId = req.params.id;
    const { userId } = req.body; // Current user's Better Auth ID

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const targetUser = await User.findOne({ betterAuthId: targetBetterAuthId });
    const currentUser = await User.findOne({ betterAuthId: userId });

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!currentUser.following.includes(targetUser._id)) {
      return res.status(400).json({ message: "Not following this user" });
    }

    // Remove from following/followers arrays
    currentUser.following = currentUser.following.filter(
      (id) => !id.equals(targetUser._id)
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => !id.equals(currentUser._id)
    );

    // Update stats
    currentUser.stats.followingCount = currentUser.following.length;
    targetUser.stats.followersCount = targetUser.followers.length;

    await currentUser.save();
    await targetUser.save();

    res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    console.error("❌ Error unfollowing user:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const betterAuthId = req.params.id;
    const user = await User.findOne({ betterAuthId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const postsCount = await Post.countDocuments({
      author: user._id,
      status: "published",
    });

    res.json({
      postsCount,
      followersCount: user.followers.length,
      followingCount: user.following.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const { userId } = req.body; // Get from request body instead of query

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find user by Better Auth ID and populate role
    const user = await User.findOne({ betterAuthId: userId }).populate(
      "role",
      "name displayName permissions"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data with role information
    res.json({
      user: {
        _id: user._id,
        betterAuthId: user.betterAuthId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        location: user.location,
        skills: user.skills,
        socialLinks: user.socialLinks,
        role: user.role,
        roleName: user.roleName || (user.role ? user.role.name : "user"),
        followers: user.followers,
        following: user.following,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getUserStats,
  getCurrentUser,
};
