const mongoose = require("mongoose");
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const MONGODB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.v4ewn.mongodb.net/coders-corner?retryWrites=true&w=majority&appName=Cluster0`;

const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

async function updateReferences() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users for mapping
    const users = await User.find({});
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user.betterAuthId, user._id);
    });

    console.log(`\n👥 Found ${users.length} users in User collection`);

    // Update Posts
    console.log("\n📝 Updating Post references...");
    const posts = await Post.find({});
    let postUpdateCount = 0;

    for (const post of posts) {
      // Check if author is already an ObjectId
      if (
        mongoose.Types.ObjectId.isValid(post.author) &&
        post.author.toString().length === 24
      ) {
        console.log(`⏭️  Post ${post._id} already has ObjectId author`);
        continue;
      }

      // Author is a string (betterAuthId), convert to ObjectId
      const userObjectId = userMap.get(post.author);
      if (userObjectId) {
        post.author = userObjectId;
        await post.save();
        postUpdateCount++;
        console.log(`✅ Updated post ${post._id}`);
      } else {
        console.log(`⚠️  No user found for betterAuthId: ${post.author}`);
      }
    }

    console.log(`\n✅ Updated ${postUpdateCount} posts`);

    // Update Comments
    console.log("\n💬 Updating Comment references...");
    const comments = await Comment.find({});
    let commentUpdateCount = 0;

    for (const comment of comments) {
      // Check if author is already an ObjectId
      if (
        mongoose.Types.ObjectId.isValid(comment.author) &&
        comment.author.toString().length === 24
      ) {
        console.log(`⏭️  Comment ${comment._id} already has ObjectId author`);
        continue;
      }

      // Author is a string (betterAuthId), convert to ObjectId
      const userObjectId = userMap.get(comment.author);
      if (userObjectId) {
        comment.author = userObjectId;
        await comment.save();
        commentUpdateCount++;
        console.log(`✅ Updated comment ${comment._id}`);
      } else {
        console.log(`⚠️  No user found for betterAuthId: ${comment.author}`);
      }
    }

    console.log(`\n✅ Updated ${commentUpdateCount} comments`);

    console.log("\n📊 Update Summary:");
    console.log(`  📝 Posts updated: ${postUpdateCount}`);
    console.log(`  💬 Comments updated: ${commentUpdateCount}`);

    console.log("\n✅ Reference update completed successfully!");
  } catch (error) {
    console.error("❌ Update failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run update
updateReferences();
