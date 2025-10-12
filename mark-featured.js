const mongoose = require("mongoose");
const Post = require("./models/Post");

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

// Mark some posts as featured for demo
const markFeaturedPosts = async () => {
  try {
    console.log("🔄 Marking sample posts as featured...");

    // Find published posts and mark the first 3 as featured
    const publishedPosts = await Post.find({ status: "published" })
      .sort({ publishedAt: -1 })
      .limit(3);

    console.log(`📊 Found ${publishedPosts.length} published posts`);

    let featured = 0;
    for (const post of publishedPosts) {
      post.isFeatured = true;
      await post.save();
      featured++;
      console.log(`✅ Marked as featured: "${post.title}"`);
    }

    console.log(`\n📈 Summary:`);
    console.log(`  Featured posts: ${featured}`);
  } catch (error) {
    console.error("❌ Error marking featured posts:", error);
  }
};

// Run the script
const runScript = async () => {
  await connectDB();
  await markFeaturedPosts();
  console.log("🎉 Script completed");
  process.exit(0);
};

runScript();
