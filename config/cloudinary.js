import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "./config.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

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

const uploadSingle = upload.single("image");

const uploadMultiple = upload.array("images", 10);

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

const getPublicIdFromUrl = (url) => {
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
