import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureUserExists } from "../utils/userSync.js";
import {
  GOOGLE_GEMINI_API_KEY,
  POSTS_DEFAULT_LIMIT,
  EXCERPT_LENGTH,
  READING_TIME_WORDS_PER_MINUTE,
  AI_EXCERPT_MAX_LENGTH,
  AI_EXCERPT_MAX_TOKENS,
  AI_TIMEOUT_MS,
  GEMINI_MODEL,
  GEMINI_TEMPERATURE,
  GEMINI_TOP_P,
  GEMINI_TOP_K,
  GEMINI_CONTENT_PREVIEW_LENGTH,
  USER_FEATURED_POSTS_LIMIT,
  ENABLE_AI_FEATURES,
} from "../config/config.js";
import dotenv from "dotenv";
dotenv.config();

const stripHtml = (html) => {
  if (!html) return "";

  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);

const getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = POSTS_DEFAULT_LIMIT,
      category,
      tag,
      author,
      featured,
    } = req.query;
    const query = { status: "published" };

    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };
    if (featured === "true") query.isFeatured = true;

    if (author) {
      const user = await User.findOne({ betterAuthId: author });
      if (user) {
        query.author = user._id;
      } else {
        return res.json({
          posts: [],
          totalPages: 0,
          currentPage: page,
        });
      }
    }

    const posts = await Post.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate(
        "author",
        "name avatar bio betterAuthId location position education work createdAt"
      );

    const postsWithAuthors = posts.map((post) => ({
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
        bio: post.author.bio,
        location: post.author.location,
        position: post.author.position,
        education: post.author.education,
        work: post.author.work,
        joinedAt: post.author.createdAt,
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

    post.views += 1;
    await post.save();

    await post.populate(
      "author",
      "name avatar bio betterAuthId location position education work createdAt"
    );

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
        location: post.author.location,
        position: post.author.position,
        education: post.author.education,
        work: post.author.work,
        joinedAt: post.author.createdAt,
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
      userId,
      coverImage,
      images = [],
      isFeatured = false,
    } = req.body;

    let user = await ensureUserExists(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wordCount = content.split(/\s+/).length;
    let readingTime = Math.max(
      1,
      Math.ceil(wordCount / READING_TIME_WORDS_PER_MINUTE)
    );

    let excerpt = stripHtml(content).substring(0, EXCERPT_LENGTH).trim();
    if (stripHtml(content).length > EXCERPT_LENGTH) {
      excerpt += "...";
    }

    try {
      if (ENABLE_AI_FEATURES && GOOGLE_GEMINI_API_KEY) {
        console.log("🤖 Starting AI excerpt generation...");

        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: {
            temperature: GEMINI_TEMPERATURE,
            maxOutputTokens: AI_EXCERPT_MAX_TOKENS,
            topP: GEMINI_TOP_P,
            topK: GEMINI_TOP_K,
          },
        });

        const cleanContent = stripHtml(content);
        console.log("📝 Clean content length:", cleanContent.length);

        const excerptPrompt = `Write a concise excerpt for this blog post. Keep it under ${AI_EXCERPT_MAX_LENGTH} words (about ${AI_EXCERPT_MAX_TOKENS} tokens).

Title: "${title}"

Content: ${cleanContent.substring(0, GEMINI_CONTENT_PREVIEW_LENGTH)}

Requirements:
- 2-3 sentences maximum
- Under ${AI_EXCERPT_MAX_LENGTH} words total
- Engaging and compelling
- No HTML or formatting
- Summarize the main idea

Excerpt:`;

        console.log("📤 Sending prompt to Gemini...");
        console.log("📝 Prompt length:", excerptPrompt.length);

        const excerptResult = await Promise.race([
          model.generateContent(excerptPrompt),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`AI timeout after ${AI_TIMEOUT_MS / 1000} seconds`)
                ),
              AI_TIMEOUT_MS
            )
          ),
        ]);

        console.log("✅ AI response received");

        console.log("🔍 Response structure:", {
          hasCandidates: !!excerptResult.response.candidates,
          candidatesLength: excerptResult.response.candidates?.length,
          firstCandidate: excerptResult.response.candidates?.[0],
          usageMetadata: excerptResult.response.usageMetadata,
        });

        if (
          excerptResult.response.candidates &&
          excerptResult.response.candidates.length > 0
        ) {
          const candidate = excerptResult.response.candidates[0];
          console.log("🔍 Candidate details:", {
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings,
            hasContent: !!candidate.content,
            contentRole: candidate.content?.role,
            partsCount: candidate.content?.parts?.length,
          });
        }

        let aiExcerpt = "";
        try {
          aiExcerpt = excerptResult.response.text().trim();
          console.log(
            "📝 Extracted via text() method, length:",
            aiExcerpt.length
          );
        } catch (textError) {
          console.log("⚠️ Standard text() failed:", textError.message);

          if (
            excerptResult.response.candidates &&
            excerptResult.response.candidates.length > 0
          ) {
            const candidate = excerptResult.response.candidates[0];
            console.log("🔍 Candidate structure:", candidate);

            if (
              candidate.content &&
              candidate.content.parts &&
              candidate.content.parts.length > 0
            ) {
              aiExcerpt = candidate.content.parts[0].text || "";
              console.log(
                "📝 Extracted from candidate.parts[0].text, length:",
                aiExcerpt.length
              );
            } else if (candidate.text) {
              aiExcerpt = candidate.text;
              console.log(
                "📝 Extracted from candidate.text, length:",
                aiExcerpt.length
              );
            }
          }
          aiExcerpt = aiExcerpt.trim();
        }

        console.log(
          "📝 AI excerpt generated:",
          aiExcerpt.substring(0, 100) + (aiExcerpt.length > 100 ? "..." : "")
        );

        let cleanExcerpt = aiExcerpt
          .replace(/[*_`~]/g, "")
          .replace(/\n+/g, " ")
          .replace(/\s+/g, " ")
          .replace(/[""]/g, '"')
          .replace(/['']/g, "'")
          .trim();

        console.log(
          "🧹 Cleaned excerpt:",
          cleanExcerpt.substring(0, 100) +
            (cleanExcerpt.length > 100 ? "..." : "")
        );

        const excerptWordCount = cleanExcerpt.split(/\s+/).length;
        if (
          cleanExcerpt &&
          cleanExcerpt.length > 10 &&
          cleanExcerpt.length < 200 &&
          excerptWordCount <= 80 &&
          !cleanExcerpt.includes("<") &&
          !cleanExcerpt.includes("*") &&
          cleanExcerpt.split(".").length <= 3
        ) {
          excerpt = cleanExcerpt;
          console.log(
            `✅ AI excerpt accepted (${excerptWordCount} words, ${cleanExcerpt.length} chars)`
          );
        } else if (cleanExcerpt && cleanExcerpt.length > 200) {
          const truncated = cleanExcerpt.substring(0, 180).trim();
          const lastSpace = truncated.lastIndexOf(" ");
          const finalExcerpt =
            lastSpace > 0
              ? truncated.substring(0, lastSpace) + "..."
              : truncated + "...";

          if (finalExcerpt.length > 20) {
            excerpt = finalExcerpt;
            console.log(
              `✅ AI excerpt accepted (truncated to ${finalExcerpt.length} chars)`
            );
          } else {
            console.log(`⚠️ AI excerpt too short even after truncation`);
          }
        } else {
          console.log(
            `⚠️ AI excerpt rejected (${excerptWordCount} words, ${cleanExcerpt.length} chars - invalid content)`
          );
        }
      } else {
        console.log("⚠️ No GEMINI_API_KEY found, skipping AI excerpt");
      }
    } catch (aiError) {
      console.log("🤖 AI excerpt generation failed:", aiError.message);

      if (aiError.message.includes("timeout")) {
        console.log(
          "⏰ AI request timed out - this is normal for slow API responses"
        );
      } else if (aiError.message.includes("quota")) {
        console.log("💰 AI quota exceeded - check your Gemini API usage");
      } else if (aiError.message.includes("auth")) {
        console.log("🔐 AI authentication failed - check GEMINI_API_KEY");
      } else if (aiError.message.includes("network")) {
        console.log("🌐 Network error - check internet connection");
      } else if (aiError.message.includes("model")) {
        console.log("🤖 Model error - check model name and availability");
      } else {
        console.log("❌ Unknown AI error:", aiError);
      }

      console.log("📝 Using fallback excerpt instead");
    }

    const post = new Post({
      title,
      content,
      excerpt,
      coverImage,
      images,
      author: user._id,
      tags,
      category,
      status,
      isFeatured,
      readingTime,
    });

    await post.save();

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
      isFeatured,
    } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await ensureUserExists(userId);
    if (!post.author.equals(user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    if (title) post.title = title;
    if (content) {
      post.content = content;

      const cleanContent = stripHtml(content);
      post.excerpt = cleanContent.substring(0, 150).trim();
      if (cleanContent.length > 150) post.excerpt += "...";
    }
    if (tags) post.tags = tags;
    if (category) post.category = category;
    if (status) post.status = status;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (images !== undefined) post.images = images;
    if (isFeatured !== undefined) post.isFeatured = isFeatured;

    post.updatedAt = new Date();

    await post.save();

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

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await ensureUserExists(userId);
    if (!post.author.equals(user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    await Comment.deleteMany({ post: id });

    await Post.findByIdAndDelete(id);

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

    const { userId } = req.body;

    const user = await ensureUserExists(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userIndex = post.likes.indexOf(user._id);

    if (userIndex > -1) {
      post.likes.splice(userIndex, 1);
    } else {
      post.likes.push(user._id);

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
      .limit(USER_FEATURED_POSTS_LIMIT)
      .populate(
        "author",
        "name avatar bio betterAuthId location position education work createdAt"
      );

    const postsWithAuthors = posts.map((post) => ({
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
        bio: post.author.bio,
        location: post.author.location,
        position: post.author.position,
        education: post.author.education,
        work: post.author.work,
        joinedAt: post.author.createdAt,
      },
    }));

    res.json(postsWithAuthors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrendingTags = async (req, res) => {
  try {
    // Get all published posts and aggregate tags
    const posts = await Post.find({ status: "published" })
      .select("tags")
      .lean();

    // Count tag occurrences
    const tagCounts = {};
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Sort by count and convert to array
    const trendingTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag]) => tag);

    res.json(trendingTags);
  } catch (error) {
    console.error("Error fetching trending tags:", error);
    res.status(500).json({ message: error.message });
  }
};

const getFollowingFeed = async (req, res) => {
  try {
    const { userId } = req.body;
    const { limit = POSTS_DEFAULT_LIMIT, page = 1 } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log("🔄 Fetching following feed for user:", userId);

    // Find current user
    let currentUser = await User.findOne({ betterAuthId: userId });

    if (!currentUser) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Current user found:", currentUser.name);
    console.log("📋 Following count:", currentUser.following.length);

    // Get posts from users the current user is following
    const posts = await Post.find({
      author: { $in: currentUser.following },
      status: "published",
    })
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate(
        "author",
        "name avatar bio betterAuthId location position education work createdAt"
      );

    const postsWithAuthors = posts.map((post) => ({
      ...post.toObject(),
      author: {
        userId: post.author.betterAuthId,
        name: post.author.name,
        avatar: post.author.avatar,
        bio: post.author.bio,
        location: post.author.location,
        position: post.author.position,
        education: post.author.education,
        work: post.author.work,
        joinedAt: post.author.createdAt,
      },
    }));

    const total = await Post.countDocuments({
      author: { $in: currentUser.following },
      status: "published",
    });

    console.log("✅ Following feed fetched:", postsWithAuthors.length, "posts");

    res.json({
      posts: postsWithAuthors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("❌ Error fetching following feed:", error);
    res.status(500).json({ message: error.message });
  }
};

export {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
  getTrendingTags,
  getFollowingFeed,
};
