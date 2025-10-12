const mongoose = require("mongoose");
const Role = require("./models/Role");

require("dotenv").config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/CodersCorner?retryWrites=true&w=majority`;
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Seed roles
const seedRoles = async () => {
  try {
    console.log("🌱 Seeding roles...");

    // Check if roles already exist
    const existingRoles = await Role.find({});
    if (existingRoles.length > 0) {
      console.log("⚠️ Roles already exist, skipping seeding");
      return;
    }

    // Define default roles
    const roles = [
      {
        name: "user",
        displayName: "User",
        permissions: ["read", "write", "comment", "like"],
        description: "Regular user with read and write access",
        isDefault: true,
      },
      {
        name: "admin",
        displayName: "Administrator",
        permissions: [
          "read",
          "write",
          "comment",
          "like",
          "admin",
          "moderate",
          "manage_users",
        ],
        description: "Site administrator with full access",
        isDefault: false,
      },
    ];

    // Insert roles
    await Role.insertMany(roles);
    console.log("✅ Roles seeded successfully");

    // Display created roles
    const createdRoles = await Role.find({});
    console.log("📋 Created roles:");
    createdRoles.forEach((role) => {
      console.log(
        `  - ${role.displayName} (${role.name}): ${role.permissions.join(", ")}`
      );
    });
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
  }
};

// Run seeding
const runSeeding = async () => {
  await connectDB();
  await seedRoles();
  console.log("🎉 Seeding completed");
  process.exit(0);
};

runSeeding();
