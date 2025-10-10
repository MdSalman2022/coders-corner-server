const UserProfile = require("../models/UserProfile");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const getUserProfile = async (req, res) => {
  try {
    const userProfile = await UserProfile.findOne({ userId: req.params.id });
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const updates = req.body;
    // TODO: Get userId from Better Auth session
    const userId = req.body.userId || "placeholder"; // This needs proper implementation

    const userProfile = await UserProfile.findOneAndUpdate(
      { userId },
      updates,
      { new: true, upsert: true }
    );
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    // TODO: Get current user ID from Better Auth session
    const currentUserId = req.body.userId || "placeholder"; // This needs proper implementation

    const targetProfile = await UserProfile.findOne({ userId: targetUserId });
    const currentProfile = await UserProfile.findOne({ userId: currentUserId });

    if (!targetProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentProfile.following.includes(targetUserId)) {
      return res.status(400).json({ message: "Already following" });
    }

    currentProfile.following.push(targetUserId);
    targetProfile.followers.push(currentUserId);

    currentProfile.stats.followingCount = currentProfile.following.length;
    targetProfile.stats.followersCount = targetProfile.followers.length;

    await currentProfile.save();
    await targetProfile.save();

    // Create notification
    const notification = new Notification({
      recipient: targetUserId,
      sender: currentUserId,
      type: "follow",
      message: `${currentProfile.name} started following you`,
    });
    await notification.save();

    res.json({ message: "Followed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    const postsCount = await Post.countDocuments({
      author: userId,
      status: "published",
    });
    const userProfile = await UserProfile.findOne({ userId });

    res.json({
      postsCount,
      followersCount: userProfile?.followers?.length || 0,
      followingCount: userProfile?.following?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserStats,
};
