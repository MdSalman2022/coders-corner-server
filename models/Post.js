import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: { type: String },
  coverImage: { type: String },
  images: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      alt: { type: String },
      caption: { type: String },
    },
  ],
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tags: [{ type: String }],
  category: { type: String, required: true },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  isFeatured: { type: Boolean, default: false }, // New field for featured posts
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  readingTime: { type: Number },
  publishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

postSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

export default mongoose.model("Post", postSchema);
