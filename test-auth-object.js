import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Connect to MongoDB
const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/CodersCorner?retryWrites=true&w=majority`;

console.log("🔄 Connecting to MongoDB...");
await mongoose.connect(MONGODB_URI);
console.log("✅ Connected to MongoDB\n");

// Initialize Better Auth
const { initializeAuth } = await import("./config/auth.js");
const auth = await initializeAuth();

console.log("\n🔍 Auth Object Inspection:");
console.log("Type:", typeof auth);
console.log("Is null:", auth === null);
console.log("Is undefined:", auth === undefined);
console.log("\n📋 Available properties:");
console.log(Object.keys(auth));

console.log("\n🔑 Handler property:");
console.log("auth.handler type:", typeof auth.handler);
console.log("auth.handler exists:", !!auth.handler);

console.log("\n🔑 API property:");
console.log("auth.api type:", typeof auth.api);
console.log("auth.api exists:", !!auth.api);

if (auth.api) {
  console.log("\n📋 API methods:");
  console.log(Object.keys(auth.api));
}

console.log("\n✅ Better Auth object structure validated!");

await mongoose.connection.close();
process.exit(0);
