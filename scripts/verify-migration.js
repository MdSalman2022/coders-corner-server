const mongoose = require("mongoose");
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const MONGODB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.v4ewn.mongodb.net/coders-corner?retryWrites=true&w=majority&appName=Cluster0`;

const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

async function verifyMigration() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Check collections
    console.log("📋 Checking Collections:");
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const hasUsers = collectionNames.includes("users");
    const hasOldUser = collectionNames.includes("user");
    const hasOldUserProfiles = collectionNames.includes("userprofiles");

    console.log(`  users collection: ${hasUsers ? "✅" : "❌"}`);
    console.log(
      `  user collection (old): ${
        hasOldUser ? "⚠️  Still exists" : "✅ Removed"
      }`
    );
    console.log(
      `  userprofiles collection (old): ${
        hasOldUserProfiles ? "⚠️  Still exists" : "✅ Removed"
      }`
    );

    // Count documents
    console.log("\n📊 Document Counts:");
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const commentCount = await Comment.countDocuments();

    console.log(`  Users: ${userCount}`);
    console.log(`  Posts: ${postCount}`);
    console.log(`  Comments: ${commentCount}`);

    // Verify User structure
    console.log("\n👤 Sample User Document:");
    const sampleUser = await User.findOne();
    if (sampleUser) {
      console.log(`  ID: ${sampleUser._id}`);
      console.log(`  Better Auth ID: ${sampleUser.betterAuthId}`);
      console.log(`  Name: ${sampleUser.name}`);
      console.log(`  Email: ${sampleUser.email}`);
      console.log(`  Has bio: ${!!sampleUser.bio}`);
      console.log(`  Has skills: ${sampleUser.skills?.length > 0}`);
      console.log(`  Followers: ${sampleUser.followers?.length || 0}`);
      console.log(`  Following: ${sampleUser.following?.length || 0}`);
    } else {
      console.log("  ⚠️  No users found!");
    }

    // Verify Post references
    console.log("\n📝 Verifying Post References:");
    const samplePost = await Post.findOne().populate("author");
    if (samplePost) {
      console.log(`  Post ID: ${samplePost._id}`);
      console.log(`  Author type: ${typeof samplePost.author}`);
      console.log(
        `  Is ObjectId: ${mongoose.Types.ObjectId.isValid(samplePost.author)}`
      );

      if (samplePost.author && samplePost.author.name) {
        console.log(`  ✅ Population works! Author: ${samplePost.author.name}`);
      } else {
        console.log(`  ⚠️  Author ID: ${samplePost.author}`);
      }
    } else {
      console.log("  ℹ️  No posts found");
    }

    // Check all posts for string authors
    console.log("\n🔍 Checking for unmigrated Post authors:");
    const posts = await Post.find({});
    let stringAuthors = 0;
    let objectIdAuthors = 0;

    for (const post of posts) {
      if (
        typeof post.author === "string" ||
        (mongoose.Types.ObjectId.isValid(post.author) &&
          post.author.toString().length !== 24)
      ) {
        stringAuthors++;
      } else {
        objectIdAuthors++;
      }
    }

    console.log(`  ✅ ObjectId authors: ${objectIdAuthors}`);
    console.log(`  ⚠️  String authors: ${stringAuthors}`);

    // Verify Comment references
    console.log("\n💬 Verifying Comment References:");
    const sampleComment = await Comment.findOne().populate("author");
    if (sampleComment) {
      console.log(`  Comment ID: ${sampleComment._id}`);
      console.log(`  Author type: ${typeof sampleComment.author}`);
      console.log(
        `  Is ObjectId: ${mongoose.Types.ObjectId.isValid(
          sampleComment.author
        )}`
      );

      if (sampleComment.author && sampleComment.author.name) {
        console.log(
          `  ✅ Population works! Author: ${sampleComment.author.name}`
        );
      } else {
        console.log(`  ⚠️  Author ID: ${sampleComment.author}`);
      }
    } else {
      console.log("  ℹ️  No comments found");
    }

    // Check all comments for string authors
    console.log("\n🔍 Checking for unmigrated Comment authors:");
    const comments = await Comment.find({});
    let stringCommentAuthors = 0;
    let objectIdCommentAuthors = 0;

    for (const comment of comments) {
      if (
        typeof comment.author === "string" ||
        (mongoose.Types.ObjectId.isValid(comment.author) &&
          comment.author.toString().length !== 24)
      ) {
        stringCommentAuthors++;
      } else {
        objectIdCommentAuthors++;
      }
    }

    console.log(`  ✅ ObjectId authors: ${objectIdCommentAuthors}`);
    console.log(`  ⚠️  String authors: ${stringCommentAuthors}`);

    // Summary
    console.log("\n📊 Migration Status Summary:");
    const allGood =
      hasUsers &&
      userCount > 0 &&
      stringAuthors === 0 &&
      stringCommentAuthors === 0;

    if (allGood) {
      console.log("  ✅ Migration completed successfully!");
      console.log("  ✅ All references updated to ObjectId");
      console.log("  ✅ Population working correctly");

      if (hasOldUser || hasOldUserProfiles) {
        console.log(
          "\n⚠️  Old collections still exist. You can safely drop them:"
        );
        if (hasOldUser) console.log("    db.user.drop()");
        if (hasOldUserProfiles) console.log("    db.userprofiles.drop()");
      }
    } else {
      console.log("  ⚠️  Migration incomplete or has issues:");
      if (!hasUsers) console.log("    ❌ Users collection missing");
      if (userCount === 0) console.log("    ❌ No users found");
      if (stringAuthors > 0)
        console.log(`    ❌ ${stringAuthors} posts need reference update`);
      if (stringCommentAuthors > 0)
        console.log(
          `    ❌ ${stringCommentAuthors} comments need reference update`
        );
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed\n");
  }
}

// Run verification
verifyMigration();
