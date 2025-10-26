import User from "../models/User.js";
import Role from "../models/Role.js";
import mongoose from "mongoose";

async function ensureUserExists(betterAuthId) {
  try {
    let user = await User.findOne({ betterAuthId: betterAuthId });

    if (user) {
      return user;
    }

    console.log(`🔄 User not found in users collection: ${betterAuthId}`);
    console.log(`📝 Creating profile from Better Auth data...`);

    const db = mongoose.connection.db;
    const ObjectId = mongoose.Types.ObjectId;
    let query;

    try {
      query = { _id: new ObjectId(betterAuthId) };
    } catch (e) {
      query = { id: betterAuthId };
    }

    const betterAuthUser = await db.collection("user").findOne(query);

    if (!betterAuthUser) {
      console.error(`❌ User not found in Better Auth: ${betterAuthId}`);
      return null;
    }

    const defaultRole = await Role.findOne({ isDefault: true });
    if (!defaultRole) {
      console.error("❌ No default role found! Please run role seeding first.");
      return null;
    }

    user = new User({
      betterAuthId: betterAuthUser._id.toString(), // Convert ObjectId to string
      name: betterAuthUser.name || "User",
      email: betterAuthUser.email,
      avatar: betterAuthUser.image || null,
      role: defaultRole._id,
      roleName: defaultRole.name,
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
async function syncAllUsers() {
  try {
    const db = mongoose.connection.db;
    const betterAuthUsers = await db.collection("user").find({}).toArray();

    console.log(`\n🔄 Syncing ${betterAuthUsers.length} Better Auth users...`);

    let created = 0;
    let skipped = 0;

    const defaultRole = await Role.findOne({ isDefault: true });
    if (!defaultRole) {
      console.error("❌ No default role found! Please run role seeding first.");
      return { created: 0, skipped: 0, total: betterAuthUsers.length };
    }

    for (const betterAuthUser of betterAuthUsers) {
      const exists = await User.findOne({
        betterAuthId: betterAuthUser._id.toString(),
      });

      if (exists) {
        skipped++;
        continue;
      }

      const newUser = new User({
        betterAuthId: betterAuthUser._id.toString(), // Convert ObjectId to string
        name: betterAuthUser.name || "User",
        email: betterAuthUser.email,
        avatar: betterAuthUser.image || null,
        role: defaultRole._id,
        roleName: defaultRole.name,
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

export { ensureUserExists, syncAllUsers };
