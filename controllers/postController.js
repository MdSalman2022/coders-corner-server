const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ensureUserExists } = require("../utils/userSync");

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
      .skip((page - 1) * limit)
      .populate("author", "name avatar betterAuthId");

    // Transform the populated data to match frontend expectations
    const postsWithAuthors = posts.map((post) => ({
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
      },
    }));

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

    // Populate author and comments
    await post.populate("author", "name avatar bio betterAuthId");

    // Get comments with populated authors
    const commentsWithAuthors = await Promise.all(
      post.comments.map(async (commentId) => {
        const comment = await Comment.findById(commentId).populate(
          "author",
          "name avatar betterAuthId"
        );
        if (!comment) return null;

        return {
          ...comment.toObject(),
          author: {
            userId: comment.author.betterAuthId,
            name: comment.author.name,
            avatar: comment.author.avatar,
          },
        };
      })
    );

    const postWithData = {
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
        bio: post.author.bio,
      },
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
      userId, // Better Auth user ID
      coverImage,
      images = [], // Array of image objects
    } = req.body;

    // Ensure user exists in users collection (auto-create if needed)
    let user = await ensureUserExists(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate excerpt and reading time (with AI fallback)
    const wordCount = content.split(/\s+/).length;
    let readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Simple excerpt: First 150 characters + "..."
    let excerpt = content.substring(0, 150).trim();
    if (content.length > 150) {
      excerpt += "...";
    }

    // Try AI enhancement (optional - don't fail if it doesn't work)
    try {
      if (process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const excerptPrompt = `Generate a short excerpt (30-50 words) for this blog post title: "${title}". Content: ${content.substring(
          0,
          300
        )}`;

        const excerptResult = await Promise.race([
          model.generateContent(excerptPrompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI timeout")), 5000)
          ),
        ]);

        const aiExcerpt = excerptResult.response.text().trim();
        if (aiExcerpt && aiExcerpt.length > 10 && aiExcerpt.length < 200) {
          excerpt = aiExcerpt;
        }
      }
    } catch (aiError) {
      // AI failed, but we already have a fallback excerpt
      console.log("AI excerpt generation skipped:", aiError.message);
    }

    const post = new Post({
      title,
      content,
      excerpt,
      coverImage,
      images,
      author: user._id, // Use ObjectId reference
      tags,
      category,
      status,
      readingTime,
    });

    await post.save();

    // Update user stats
    await User.findByIdAndUpdate(user._id, {
      $inc: { "stats.postsCount": 1 },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userId,
      title,
      content,
      tags,
      category,
      status,
      coverImage,
      images,
    } = req.body;

    // Find the post
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user owns the post
    const user = await ensureUserExists(userId);
    if (!post.author.equals(user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    // Update fields
    if (title) post.title = title;
    if (content) {
      post.content = content;
      // Regenerate excerpt if content changed
      post.excerpt = content.substring(0, 150).trim();
      if (content.length > 150) post.excerpt += "...";
    }
    if (tags) post.tags = tags;
    if (category) post.category = category;
    if (status) post.status = status;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (images !== undefined) post.images = images;

    post.updatedAt = new Date();

    await post.save();

    // Populate author for response
    await post.populate("author", "name avatar betterAuthId");

    const postWithAuthor = {
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
      },
    };

    res.json(postWithAuthor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Find the post
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user owns the post
    const user = await ensureUserExists(userId);
    if (!post.author.equals(user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    // Delete associated comments
    await Comment.deleteMany({ post: id });

    // Delete the post
    await Post.findByIdAndDelete(id);

    // Update user stats
    await User.findByIdAndUpdate(user._id, {
      $inc: { "stats.postsCount": -1 },
    });

    res.json({ message: "Post deleted successfully" });
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

    // Find the user by betterAuthId
    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userIndex = post.likes.indexOf(user._id);

    if (userIndex > -1) {
      post.likes.splice(userIndex, 1);
    } else {
      post.likes.push(user._id);

      // Create notification if liking someone else's post
      if (post.author.toString() !== user._id.toString()) {
        const notification = new Notification({
          recipient: post.author,
          sender: user._id,
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
    })
      .limit(20)
      .populate("author", "name avatar betterAuthId");

    // Transform the populated data to match frontend expectations
    const postsWithAuthors = posts.map((post) => ({
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
      },
    }));

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
