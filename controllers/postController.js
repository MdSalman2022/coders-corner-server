const Post = require("../models/Post");
const UserProfile = require("../models/UserProfile");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, author } = req.query;
    const query = { status: "published" };

    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };
    if (author) query.author = author;

    const posts = await Post.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Populate author data manually
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const authorProfile = await UserProfile.findOne({
          userId: post.author,
        });
        return {
          ...post.toObject(),
          author: authorProfile
            ? {
                userId: authorProfile.userId,
                name: authorProfile.name,
                avatar: authorProfile.avatar,
              }
            : null,
        };
      })
    );

    const total = await Post.countDocuments(query);

    res.json({
      posts: postsWithAuthors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Increment views
    post.views += 1;
    await post.save();

    // Get author profile
    const authorProfile = await UserProfile.findOne({ userId: post.author });

    // Get comments with author profiles
    const commentsWithAuthors = await Promise.all(
      post.comments.map(async (commentId) => {
        const comment = await Comment.findById(commentId);
        if (!comment) return null;

        const commentAuthor = await UserProfile.findOne({
          userId: comment.author,
        });
        return {
          ...comment.toObject(),
          author: commentAuthor
            ? {
                userId: commentAuthor.userId,
                name: commentAuthor.name,
                avatar: commentAuthor.avatar,
              }
            : null,
        };
      })
    );

    const postWithData = {
      ...post.toObject(),
      author: authorProfile
        ? {
            userId: authorProfile.userId,
            name: authorProfile.name,
            avatar: authorProfile.avatar,
            bio: authorProfile.bio,
          }
        : null,
      comments: commentsWithAuthors.filter((c) => c !== null),
    };

    res.json(postWithData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    const {
      title,
      content,
      tags,
      category,
      status = "draft",
      userId,
    } = req.body;

    // Generate excerpt and reading time using AI
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const excerptPrompt = `Generate a short excerpt (50-100 words) for this blog post title: "${title}". Content: ${content.substring(
      0,
      500
    )}`;
    const readingTimePrompt = `Estimate reading time in minutes for this content: ${content}`;

    const [excerptResult, readingTimeResult] = await Promise.all([
      model.generateContent(excerptPrompt),
      model.generateContent(readingTimePrompt),
    ]);

    const excerpt = excerptResult.response.text();
    const readingTime = parseInt(readingTimeResult.response.text()) || 5;

    const post = new Post({
      title,
      content,
      excerpt,
      author: userId, // Better Auth user ID
      tags,
      category,
      status,
      readingTime,
    });

    await post.save();

    // Update user stats
    await UserProfile.findOneAndUpdate(
      { userId },
      { $inc: { "stats.postsCount": 1 } },
      { upsert: true }
    );

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // TODO: Check authorization with Better Auth user ID
    // if (post.author !== req.userId) {
    //   return res.status(403).json({ message: "Not authorized" });
    // }

    const updates = req.body;
    Object.assign(post, updates);
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // TODO: Check authorization with Better Auth user ID
    // if (post.author !== req.userId) {
    //   return res.status(403).json({ message: "Not authorized" });
    // }

    await Post.findByIdAndDelete(req.params.id);
    await UserProfile.findOneAndUpdate(
      { userId: post.author },
      { $inc: { "stats.postsCount": -1 } }
    );

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const { userId } = req.body; // Better Auth user ID
    const userIndex = post.likes.indexOf(userId);

    if (userIndex > -1) {
      post.likes.splice(userIndex, 1);
    } else {
      post.likes.push(userId);

      // Create notification
      if (post.author !== userId) {
        const notification = new Notification({
          recipient: post.author,
          sender: userId,
          type: "like",
          message: "Someone liked your post",
          post: post._id,
        });
        await notification.save();
      }
    }

    await post.save();
    res.json({ likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    const posts = await Post.find({
      status: "published",
      $or: [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ],
    }).limit(20);

    // Populate author data manually
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const authorProfile = await UserProfile.findOne({
          userId: post.author,
        });
        return {
          ...post.toObject(),
          author: authorProfile
            ? {
                userId: authorProfile.userId,
                name: authorProfile.name,
                avatar: authorProfile.avatar,
              }
            : null,
        };
      })
    );

    res.json(postsWithAuthors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
};
