import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

const connectDB = async () => {
  try {
    const uri = MONGODB_URI;
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
