const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { ensureUserExists } = require("../utils/userSync");

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("author", "name avatar betterAuthId");

    // Transform the populated data to match frontend expectations
    const commentsWithAuthors = comments.map((comment) => ({
      ...comment.toObject(),
      author: {
        userId: comment.author.betterAuthId,
        name: comment.author.name,
        avatar: comment.author.avatar,
      },
    }));

    res.json(commentsWithAuthors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, userId } = req.body;

    // Ensure user exists in users collection (auto-create if needed)
    const user = await ensureUserExists(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = new Comment({
      content,
      author: user._id, // Use ObjectId reference
      post: postId,
    });

    await comment.save();

    // Add comment to post
    post.comments.push(comment._id);
    await post.save();

    // Populate author data and return
    await comment.populate("author", "name avatar betterAuthId");
    const commentWithAuthor = {
      ...comment.toObject(),
      author: {
        userId: comment.author.betterAuthId,
        name: comment.author.name,
        avatar: comment.author.avatar,
      },
    };

    // Create notification if commenting on someone else's post
    if (post.author.toString() !== user._id.toString()) {
      const notification = new Notification({
        recipient: post.author,
        sender: user._id,
        type: "comment",
        message: "Someone commented on your post",
        post: postId,
        comment: comment._id,
      });
      await notification.save();
    }

    res.status(201).json(commentWithAuthor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, userId } = req.body;

    // Find user
    const user = await User.findOne({ betterAuthId: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check authorization
    if (comment.author.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.content = content;
    await comment.save();

    // Populate and return
    await comment.populate("author", "name avatar betterAuthId");
    const commentWithAuthor = {
      ...comment.toObject(),
      author: {
        userId: comment.author.betterAuthId,
        name: comment.author.name,
        avatar: comment.author.avatar,
      },
    };

    res.json(commentWithAuthor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    // Find user
    const user = await User.findOne({ betterAuthId: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check authorization
    if (comment.author.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: commentId },
    });

    await Comment.findByIdAndDelete(commentId);
    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    // Find user
    const user = await User.findOne({ betterAuthId: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userIndex = comment.likes.indexOf(user._id);
    if (userIndex > -1) {
      comment.likes.splice(userIndex, 1);
    } else {
      comment.likes.push(user._id);
    }

    await comment.save();
    res.json({ likes: comment.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
};
