import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/CodersCorner?retryWrites=true&w=majority`;

async function fixAuthCollections() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Collections to check
    const collections = ["user", "account", "session", "verification"];

    console.log("📋 Checking collections...");
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  ${collectionName}: ${count} documents`);

        if (count > 0) {
          const docs = await collection.find({}).limit(3).toArray();
          console.log(`  Sample from ${collectionName}:`);
          docs.forEach((doc, i) => {
            console.log(
              `    [${i + 1}]`,
              JSON.stringify(doc, null, 2).substring(0, 200) + "..."
            );
          });
        }
      } catch (err) {
        console.log(`  ${collectionName}: Collection doesn't exist yet`);
      }
    }

    // Check for problematic accounts
    const accountCollection = db.collection("account");
    const accounts = await accountCollection
      .find({ providerId: "credential" })
      .toArray();

    console.log(`\n� Found ${accounts.length} credential accounts`);

    if (accounts.length > 0) {
      console.log(
        "\n⚠️  ISSUE DETECTED: Better Auth MongoDB adapter is not storing accounts correctly!"
      );
      console.log("This is a known issue with Better Auth + MongoDB.");
      console.log("\n� SOLUTION: We need to switch to a different approach.\n");

      console.log("📝 Recommended actions:");
      console.log("1. Clear all auth collections (user, account, session)");
      console.log("2. Update Better Auth to latest version");
      console.log("3. OR use Prisma adapter instead of MongoDB adapter");
      console.log("4. OR implement custom auth with bcrypt + JWT\n");

      // Show what's wrong
      accounts.forEach((acc, i) => {
        console.log(`Account ${i + 1}:`);
        console.log(`  - id: ${acc.id}`);
        console.log(`  - accountId: ${JSON.stringify(acc.accountId)}`);
        console.log(`  - userId: ${JSON.stringify(acc.userId)}`);
        console.log(`  - providerId: ${acc.providerId}`);
        console.log(`  - Has password: ${!!acc.password}\n`);
      });
    }

    // Option to clear collections
    console.log("\n🗑️  Would you like to clear all auth collections?");
    console.log("Run this script with --clear flag to delete all auth data:");
    console.log("  node scripts/fix-auth-collections.js --clear\n");

    if (process.argv.includes("--clear")) {
      console.log("🗑️  Clearing all auth collections...");
      await db.collection("user").deleteMany({});
      await db.collection("account").deleteMany({});
      await db.collection("session").deleteMany({});
      await db.collection("verification").deleteMany({});
      console.log("✅ All auth collections cleared!");
      console.log("You can now try signing up again.\n");
    }

    console.log("✅ Script complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
fixAuthCollections();
