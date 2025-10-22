import express from "express";
import {
  uploadSingle,
  uploadMultiple,
  uploadToCloudinary,
  deleteImage,
  getPublicIdFromUrl,
  cloudinary,
} from "../config/cloudinary.js";
import { generalLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Upload single image
router.post("/single", generalLimiter, uploadSingle, async (req, res) => {
  try {
    console.log("📥 Upload request received");
    console.log(
      "File info:",
      req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "No file"
    );

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    console.log("📤 Uploading to Cloudinary...");

    // Upload to Cloudinary - no resource_type needed, it's auto
    const result = await uploadToCloudinary(req.file.buffer, {
      public_id: `blog-posts/post-${Date.now()}`,
      folder: "blog-posts",
    });

    console.log("✅ Upload successful!");

    // Return the uploaded image details
    res.json({
      success: true,
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        format: result.format,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      error: error.message || "Failed to upload image",
    });
  }
});

// Upload multiple images
router.post("/multiple", generalLimiter, uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded",
      });
    }

    console.log(`📤 Uploading ${req.files.length} images to Cloudinary...`);

    // Upload each file to Cloudinary
    const uploadPromises = req.files.map(async (file, index) => {
      const result = await uploadToCloudinary(file.buffer, {
        public_id: `blog-posts/post-${Date.now()}-${index}`,
        folder: "blog-posts",
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname,
        size: file.size,
        format: result.format,
        width: result.width,
        height: result.height,
      };
    });

    const images = await Promise.all(uploadPromises);

    console.log(`✅ Successfully uploaded ${images.length} images`);

    res.json({
      success: true,
      images: images,
    });
  } catch (error) {
    console.error("❌ Multiple upload error:", error);
    res.status(500).json({
      error: error.message || "Failed to upload images",
    });
  }
});

// Delete image
router.delete("/:publicId", generalLimiter, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        error: "Public ID is required",
      });
    }

    const result = await deleteImage(publicId);

    if (result.result === "ok") {
      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      res.status(400).json({
        error: "Failed to delete image",
      });
    }
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({
      error: "Failed to delete image",
    });
  }
});

// Get image info
router.get("/info/:publicId", generalLimiter, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        error: "Public ID is required",
      });
    }

    // Get image info from Cloudinary
    const result = await cloudinary.api.resource(publicId);

    res.json({
      success: true,
      image: {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        url: result.secure_url,
        createdAt: result.created_at,
      },
    });
  } catch (error) {
    console.error("Get image info error:", error);
    res.status(404).json({
      error: "Image not found",
    });
  }
});

export default router;
