import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.Cloudinary_CloudName,
  api_key: process.env.Cloudinary_API_KEY,
  api_secret: process.env.Cloudinary_API_SECRET,
  secure: true,
});

console.log("🔧 Cloudinary Configuration:", {
  cloud_name: cloudinary.config().cloud_name || "not set",
  api_key: cloudinary.config().api_key ? "✅ Set" : "❌ Missing",
  api_secret: cloudinary.config().api_secret ? "✅ Set" : "❌ Missing",
});

// Configure multer for memory storage (we'll upload to Cloudinary after)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload to Cloudinary function
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || "blog-posts",
      resource_type: "auto",
      public_id: options.public_id,
      transformation: options.transformation || [
        { width: 1200, height: 800, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    };

    console.log("📤 Uploading to Cloudinary with options:", {
      folder: uploadOptions.folder,
      public_id: uploadOptions.public_id,
    });

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("✅ Cloudinary upload success:", {
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
          });
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
};

// Single image upload middleware
const uploadSingle = upload.single("image");

// Multiple images upload middleware
const uploadMultiple = upload.array("images", 10); // Max 10 images

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
  return matches ? matches[1] : null;
};

export {
  cloudinary,
  uploadSingle,
  uploadMultiple,
  uploadToCloudinary,
  deleteImage,
  getPublicIdFromUrl,
};
