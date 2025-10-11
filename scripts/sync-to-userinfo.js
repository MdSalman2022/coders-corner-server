const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const MONGODB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.v4ewn.mongodb.net/coders-corner?retryWrites=true&w=majority&appName=Cluster0`;

async function syncAllUsersToUserinfo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get all Better Auth users
    const betterAuthUsers = await db.collection("user").find({}).toArray();
    console.log(`👥 Found ${betterAuthUsers.length} Better Auth users`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const betterAuthUser of betterAuthUsers) {
      try {
        // Check if user already exists in userinfo collection
        const existingUser = await User.findOne({
          betterAuthId: betterAuthUser.id,
        });

        if (existingUser) {
          console.log(`⏭️  Skipped: ${betterAuthUser.email} (already exists)`);
          skipped++;
          continue;
        }

        // Create user in userinfo collection
        const newUser = new User({
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

        await newUser.save();
        console.log(`✅ Created: ${newUser.email} (${newUser._id})`);
        created++;
      } catch (error) {
        console.error(
          `❌ Error creating user ${betterAuthUser.email}:`,
          error.message
        );
        errors++;
      }
    }

    console.log("\n📊 Sync Summary:");
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Total Better Auth users: ${betterAuthUsers.length}`);

    // Show final counts
    const finalUserCount = await User.countDocuments();
    console.log(`\n👥 Final userinfo collection count: ${finalUserCount}`);

    if (created > 0) {
      console.log("\n🎉 Successfully synced users to userinfo collection!");
    } else {
      console.log("\nℹ️  All users were already synced.");
    }
  } catch (error) {
    console.error("❌ Sync failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run sync
syncAllUsersToUserinfo();
