const mongoose = require("mongoose");
const { syncAllUsers } = require("../utils/userSync");
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const MONGODB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.v4ewn.mongodb.net/coders-corner?retryWrites=true&w=majority&appName=Cluster0`;

async function runSync() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("🔄 Starting user sync...\n");
    await syncAllUsers();

    console.log("\n✅ Sync completed successfully!");
  } catch (error) {
    console.error("❌ Sync failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

runSync();
