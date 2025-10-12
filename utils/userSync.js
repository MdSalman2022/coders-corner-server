const User = require("../models/User");
const Role = require("../models/Role");
const mongoose = require("mongoose");

/**
 * Ensures a User profile exists in the users collection
 * If not, creates one from Better Auth data
 * Industry standard: Lazy loading/Just-in-time sync
 */
async function ensureUserExists(betterAuthId) {
  try {
    // Check if user already exists
    let user = await User.findOne({ betterAuthId });

    if (user) {
      return user;
    }

    console.log(`🔄 User not found in users collection: ${betterAuthId}`);
    console.log(`📝 Creating profile from Better Auth data...`);

    // Get user from Better Auth collection
    const db = mongoose.connection.db;
    const betterAuthUser = await db
      .collection("user")
      .findOne({ id: betterAuthId });

    if (!betterAuthUser) {
      console.error(`❌ User not found in Better Auth: ${betterAuthId}`);
      return null;
    }

    // Get default user role
    const defaultRole = await Role.findOne({ isDefault: true });
    if (!defaultRole) {
      console.error("❌ No default role found! Please run role seeding first.");
      return null;
    }

    // Create User profile
    user = new User({
      betterAuthId: betterAuthUser.id,
      name: betterAuthUser.name || "User",
      email: betterAuthUser.email,
      avatar: betterAuthUser.image || null,
      role: defaultRole._id, // Assign default role
      roleName: defaultRole.name, // Cache role name for performance
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

    await user.save();
    console.log(`✅ Created User profile for: ${user.email} (${user._id})`);

    return user;
  } catch (error) {
    console.error("❌ Error ensuring user exists:", error);
    return null;
  }
}

/**
 * Syncs all Better Auth users to users collection
 * Useful for batch operations
 */
async function syncAllUsers() {
  try {
    const db = mongoose.connection.db;
    const betterAuthUsers = await db.collection("user").find({}).toArray();

    console.log(`\n🔄 Syncing ${betterAuthUsers.length} Better Auth users...`);

    let created = 0;
    let skipped = 0;

    // Get default user role
    const defaultRole = await Role.findOne({ isDefault: true });
    if (!defaultRole) {
      console.error("❌ No default role found! Please run role seeding first.");
      return { created: 0, skipped: 0, total: betterAuthUsers.length };
    }

    for (const betterAuthUser of betterAuthUsers) {
      const exists = await User.findOne({ betterAuthId: betterAuthUser.id });

      if (exists) {
        skipped++;
        continue;
      }

      const newUser = new User({
        betterAuthId: betterAuthUser.id,
        name: betterAuthUser.name || "User",
        email: betterAuthUser.email,
        avatar: betterAuthUser.image || null,
        role: defaultRole._id, // Assign default role
        roleName: defaultRole.name, // Cache role name for performance
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
      created++;
      console.log(`✅ Created: ${newUser.email}`);
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${betterAuthUsers.length}\n`);

    return { created, skipped, total: betterAuthUsers.length };
  } catch (error) {
    console.error("❌ Error syncing users:", error);
    throw error;
  }
}

module.exports = {
  ensureUserExists,
  syncAllUsers,
};
