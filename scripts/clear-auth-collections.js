const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/CodersCorner?retryWrites=true&w=majority`;

async function clearAuthCollections() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Collections to clear
    const collections = ["user", "account", "session", "verification"];

    console.log("🗑️  Clearing Better Auth collections for fresh start...");
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        if (count > 0) {
          await collection.deleteMany({});
          console.log(`  ✅ Cleared ${collectionName} (${count} documents)`);
        } else {
          console.log(`  ℹ️  ${collectionName} was already empty`);
        }
      } catch (err) {
        console.log(`  ⚠️  ${collectionName} doesn't exist yet - that's OK`);
      }
    }

    console.log("\n✅ All Better Auth collections cleared!");
    console.log("\n🚀 Next Steps:");
    console.log("1. Restart the backend server");
    console.log("2. Try signing up at http://localhost:3000/auth/signup");
    console.log("3. Try logging in with same credentials");
    console.log("4. Check if 'Credential account not found' error is gone!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
clearAuthCollections();
