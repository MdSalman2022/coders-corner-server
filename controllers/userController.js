import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";

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

    console.log(`🔍 Looking up user by Better Auth ID: ${id}`);
    user = await User.findOne({ betterAuthId: id });

    if (!user) {
      console.log(`🔄 Attempting to create profile from Better Auth data...`);

      try {
        const db = mongoose.connection.db;
        const betterAuthUser = await db.collection("user").findOne({ id });

        if (betterAuthUser) {
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
    const { userId } = req.body;
    const updates = req.body;

    delete updates.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findOne({ betterAuthId: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedFields = [
      "name",
      "bio",
      "website",
      "location",
      "skills",
      "socialLinks",
      "preferences",
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log("🔄 Follow request:", {
      targetBetterAuthId,
      currentUserId: userId,
    });

    const targetUser = await User.findOne({ betterAuthId: targetBetterAuthId });
    const currentUser = await User.findOne({ betterAuthId: userId });

    if (!targetUser) {
      console.log("❌ Target user not found:", targetBetterAuthId);
      return res.status(404).json({ message: "Target user not found" });
    }

    if (!currentUser) {
      console.log("❌ Current user not found:", userId);
      return res.status(404).json({ message: "Current user not found" });
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

    console.log("✅ Follow successful:", {
      current: currentUser.name,
      target: targetUser.name,
    });

    const notification = new Notification({
      recipient: targetUser._id,
      sender: currentUser._id,
      type: "follow",
      message: `${currentUser.name} started following you`,
    });
    await notification.save();

    res.json({ message: "Followed successfully" });
  } catch (error) {
    console.error("❌ Error following user:", error);
    res.status(500).json({ message: error.message });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const targetBetterAuthId = req.params.id;
    const { userId } = req.body;

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

    currentUser.following = currentUser.following.filter(
      (id) => !id.equals(targetUser._id)
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => !id.equals(currentUser._id)
    );

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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findOne({ betterAuthId: userId })
      .populate("role", "name displayName permissions")
      .populate("followers", "name avatar betterAuthId email")
      .populate("following", "name avatar betterAuthId email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

const getFollowingUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find user by MongoDB _id or betterAuthId
    let user = await User.findById(userId).populate(
      "following",
      "name avatar betterAuthId email"
    );

    if (!user) {
      user = await User.findOne({ betterAuthId: userId }).populate(
        "following",
        "name avatar betterAuthId email"
      );
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Fetched following users:", {
      userId: user.betterAuthId,
      count: user.following.length,
    });

    res.json({
      following: user.following || [],
      count: user.following?.length || 0,
    });
  } catch (error) {
    console.error("❌ Error fetching following users:", error);
    res.status(500).json({ message: error.message });
  }
};

const getFollowerUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find user by MongoDB _id or betterAuthId
    let user = await User.findById(userId).populate(
      "followers",
      "name avatar betterAuthId email"
    );

    if (!user) {
      user = await User.findOne({ betterAuthId: userId }).populate(
        "followers",
        "name avatar betterAuthId email"
      );
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Fetched follower users:", {
      userId: user.betterAuthId,
      count: user.followers.length,
    });

    res.json({
      followers: user.followers || [],
      count: user.followers?.length || 0,
    });
  } catch (error) {
    console.error("❌ Error fetching follower users:", error);
    res.status(500).json({ message: error.message });
  }
};

export {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getUserStats,
  getCurrentUser,
  getFollowingUsers,
  getFollowerUsers,
};
