import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureUserExists } from "../utils/userSync.js";

// Function to strip HTML tags and get clean text
const stripHtml = (html) => {
  if (!html) return "";

  // Remove HTML tags using regex
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/&amp;/g, "&") // Replace ampersands
    .replace(/&lt;/g, "<") // Replace less than
    .replace(/&gt;/g, ">") // Replace greater than
    .replace(/&quot;/g, '"') // Replace quotes
    .replace(/&#39;/g, "'") // Replace apostrophes
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Debug: Check API key on startup
console.log("🔧 Gemini AI Configuration:");
console.log("  API Key present:", !!process.env.GEMINI_API_KEY);
console.log(
  "  API Key length:",
  process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0
);
console.log(
  "  API Key starts with:",
  process.env.GEMINI_API_KEY
    ? process.env.GEMINI_API_KEY.substring(0, 10) + "..."
    : "none"
);

const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, author, featured } = req.query;
    const query = { status: "published" };

    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };
    if (featured === "true") query.isFeatured = true;

    // Handle author filtering by betterAuthId
    if (author) {
      const user = await User.findOne({ betterAuthId: author });
      if (user) {
        query.author = user._id;
      } else {
        // If user not found, return empty results
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

    // Transform the populated data to match frontend expectations
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

    // Increment views
    post.views += 1;
    await post.save();

    // Populate author and comments
    await post.populate(
      "author",
      "name avatar bio betterAuthId location position education work createdAt"
    );

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
      userId, // Better Auth user ID
      coverImage,
      images = [], // Array of image objects
      isFeatured = false, // Add featured flag
    } = req.body;

    // Ensure user exists in users collection (auto-create if needed)
    let user = await ensureUserExists(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate excerpt and reading time (with AI fallback)
    const wordCount = content.split(/\s+/).length;
    let readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Simple excerpt: First 150 characters from clean text + "..."
    let excerpt = stripHtml(content).substring(0, 150).trim();
    if (stripHtml(content).length > 150) {
      excerpt += "...";
    }

    // Try AI enhancement (optional - don't fail if it doesn't work)
    try {
      if (process.env.GEMINI_API_KEY) {
        console.log("🤖 Starting AI excerpt generation...");

        // Use the working model: gemini-2.5-flash-lite
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150, // Reduced to prevent MAX_TOKENS
            topP: 0.8,
            topK: 40,
          },
        });

        // Strip HTML tags from content for clean text
        const cleanContent = stripHtml(content);
        console.log("📝 Clean content length:", cleanContent.length);

        // Create a more focused prompt with strict length limits
        const excerptPrompt = `Write a concise excerpt for this blog post. Keep it under 80 words (about 100 tokens).

Title: "${title}"

Content: ${cleanContent.substring(0, 400)}

Requirements:
- 2-3 sentences maximum
- Under 80 words total
- Engaging and compelling
- No HTML or formatting
- Summarize the main idea

Excerpt:`;

        console.log("📤 Sending prompt to Gemini...");
        console.log("📝 Prompt length:", excerptPrompt.length);

        // Increase timeout to 15 seconds for AI processing
        const excerptResult = await Promise.race([
          model.generateContent(excerptPrompt),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("AI timeout after 15 seconds")),
              15000
            )
          ),
        ]);

        console.log("✅ AI response received");

        // Debug: Log response structure
        console.log("🔍 Response structure:", {
          hasCandidates: !!excerptResult.response.candidates,
          candidatesLength: excerptResult.response.candidates?.length,
          firstCandidate: excerptResult.response.candidates?.[0],
          usageMetadata: excerptResult.response.usageMetadata,
        });

        // Check for safety ratings or finish reasons
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

        // Extract text from Gemini response properly
        let aiExcerpt = "";
        try {
          // Try the standard text() method first
          aiExcerpt = excerptResult.response.text().trim();
          console.log(
            "📝 Extracted via text() method, length:",
            aiExcerpt.length
          );
        } catch (textError) {
          console.log("⚠️ Standard text() failed:", textError.message);
          // Fallback: extract from candidates
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

        // Clean and validate the excerpt
        let cleanExcerpt = aiExcerpt
          .replace(/[*_`~]/g, "") // Remove markdown formatting: *bold*, _italic_, `code`, ~strikethrough~
          .replace(/\n+/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " ") // Normalize multiple spaces
          .replace(/[""]/g, '"') // Normalize quotes
          .replace(/['']/g, "'") // Normalize apostrophes
          .trim();

        console.log(
          "🧹 Cleaned excerpt:",
          cleanExcerpt.substring(0, 100) +
            (cleanExcerpt.length > 100 ? "..." : "")
        );

        // Validate the excerpt - be more strict about length and content
        const excerptWordCount = cleanExcerpt.split(/\s+/).length;
        if (
          cleanExcerpt &&
          cleanExcerpt.length > 10 &&
          cleanExcerpt.length < 200 &&
          excerptWordCount <= 80 &&
          !cleanExcerpt.includes("<") && // No HTML tags
          !cleanExcerpt.includes("*") && // No remaining markdown
          cleanExcerpt.split(".").length <= 3 // Max 3 sentences
        ) {
          excerpt = cleanExcerpt;
          console.log(
            `✅ AI excerpt accepted (${excerptWordCount} words, ${cleanExcerpt.length} chars)`
          );
        } else if (cleanExcerpt && cleanExcerpt.length > 200) {
          // Truncate long responses to fit our limits
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

      // Log more details for debugging
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

      // Continue with fallback excerpt (already set above)
      console.log("📝 Using fallback excerpt instead");
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
      isFeatured,
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
      isFeatured,
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
      // Regenerate excerpt if content changed - use clean text
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
      .populate(
        "author",
        "name avatar bio betterAuthId location position education work createdAt"
      );

    // Transform the populated data to match frontend expectations
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

export {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  searchPosts,
};
