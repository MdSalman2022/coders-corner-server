const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/CodersCorner?retryWrites=true&w=majority`;

async function debugAuth() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected. Listing auth collections...\n");

    const db = mongoose.connection.db;
    const collections = ["user", "account", "session", "verification"];

    for (const name of collections) {
      const exists = await db.listCollections({ name }).next();
      if (!exists) {
        console.log(`${name}: (collection does not exist)`);
        continue;
      }

      const count = await db.collection(name).countDocuments();
      console.log(`${name}: ${count} documents`);
      if (count > 0) {
        const docs = await db.collection(name).find({}).limit(5).toArray();
        docs.forEach((doc, idx) => {
          console.log(`  ${name}[${idx}] =`, JSON.stringify(doc, null, 2));
        });
      }
      console.log("");
    }
  } catch (error) {
    console.error("debug-auth error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

debugAuth();
