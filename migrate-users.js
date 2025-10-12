const mongoose = require("mongoose");
const User = require("./models/User");
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

// Migrate existing users to have roles
const migrateUsers = async () => {
  try {
    console.log("🔄 Starting user role migration...");

    // Get the default user role
    const userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      console.error("❌ Default user role not found! Run role seeding first.");
      return;
    }

    // Find all users without roles
    const usersWithoutRoles = await User.find({
      $or: [
        { role: { $exists: false } },
        { role: null },
        { roleName: { $exists: false } },
      ],
    });

    console.log(`📊 Found ${usersWithoutRoles.length} users without roles`);

    let updated = 0;
    for (const user of usersWithoutRoles) {
      user.role = userRole._id;
      user.roleName = userRole.name;
      await user.save();
      updated++;
      console.log(`✅ Assigned role to: ${user.email}`);
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total users: ${usersWithoutRoles.length}`);
  } catch (error) {
    console.error("❌ Error migrating users:", error);
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateUsers();
  console.log("🎉 Migration completed");
  process.exit(0);
};

runMigration();
