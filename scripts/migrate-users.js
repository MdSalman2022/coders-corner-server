const mongoose = require("mongoose");
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const MONGODB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.v4ewn.mongodb.net/coders-corner?retryWrites=true&w=majority&appName=Cluster0`;

// Import models
const User = require("../models/User");

async function migrateUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("\n📋 Available collections:");
    collections.forEach((col) => console.log(`  - ${col.name}`));

    // Get Better Auth users
    const betterAuthUsers = await db.collection("user").find({}).toArray();
    console.log(`\n👥 Found ${betterAuthUsers.length} Better Auth users`);

    // Get UserProfile data
    let userProfiles = [];
    try {
      userProfiles = await db.collection("userprofiles").find({}).toArray();
      console.log(`📝 Found ${userProfiles.length} user profiles`);
    } catch (error) {
      console.log("⚠️  No userprofiles collection found");
    }

    // Migrate users
    let migratedCount = 0;
    let skippedCount = 0;

    for (const betterAuthUser of betterAuthUsers) {
      try {
        // Check if user already exists in new User collection
        const existingUser = await User.findOne({
          betterAuthId: betterAuthUser.id,
        });

        if (existingUser) {
          console.log(
            `⏭️  Skipping ${betterAuthUser.email} - already migrated`
          );
          skippedCount++;
          continue;
        }

        // Find matching profile
        const profile = userProfiles.find(
          (p) =>
            p.userId === betterAuthUser.id || p.email === betterAuthUser.email
        );

        // Create new User document
        const newUser = new User({
          betterAuthId: betterAuthUser.id,
          name: betterAuthUser.name || "User",
          email: betterAuthUser.email,
          avatar: betterAuthUser.image || profile?.avatar || null,
          bio: profile?.bio || null,
          website: profile?.website || null,
          location: profile?.location || null,
          skills: profile?.skills || [],
          socialLinks: profile?.socialLinks || {
            github: null,
            linkedin: null,
            twitter: null,
          },
          followers: profile?.followers || [],
          following: profile?.following || [],
          preferences: profile?.preferences || {
            topics: [],
            darkMode: false,
          },
          stats: profile?.stats || {
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
          },
          createdAt: betterAuthUser.createdAt || new Date(),
          updatedAt: new Date(),
        });

        await newUser.save();
        console.log(`✅ Migrated: ${betterAuthUser.email}`);
        migratedCount++;
      } catch (error) {
        console.error(
          `❌ Error migrating ${betterAuthUser.email}:`,
          error.message
        );
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`  ✅ Migrated: ${migratedCount} users`);
    console.log(`  ⏭️  Skipped: ${skippedCount} users (already exists)`);
    console.log(`  📝 Total Better Auth users: ${betterAuthUsers.length}`);

    // Show final counts
    const finalUserCount = await User.countDocuments();
    console.log(`\n👥 Final User collection count: ${finalUserCount}`);

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run migration
migrateUsers();
