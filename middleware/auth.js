import User from "../models/User.js";
import Role from "../models/Role.js";

const PERMISSIONS = {
  READ: "read",
  WRITE: "write",
  COMMENT: "comment",
  LIKE: "like",
  ADMIN: "admin",
  MODERATE: "moderate",
  MANAGE_USERS: "manage_users",
};

const getUserFromRequest = async (req, res, next) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(userId).populate("role");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

const hasPermission = async (userId, permission) => {
  console.log("userId, permission", userId, permission);
  try {
    const user = await User.findOne({ betterAuthId: userId }).populate("role");
    console.log("userdata", user);
    if (!user || !user.role) {
      return false;
    }

    return user.role.permissions.includes(permission);
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
};

const hasAnyPermission = async (userId, permissions) => {
  try {
    const user = await User.findById(userId).populate("role");
    if (!user || !user.role) {
      return false;
    }

    return permissions.some((permission) =>
      user.role.permissions.includes(permission)
    );
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
};

const hasAllPermissions = async (userId, permissions) => {
  try {
    const user = await User.findById(userId).populate("role");
    if (!user || !user.role) {
      return false;
    }

    return permissions.every((permission) =>
      user.role.permissions.includes(permission)
    );
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
};

const isAdmin = async (userId) => {
  console.log("isAdmin", userId);
  return await hasPermission(userId, PERMISSIONS.ADMIN);
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.body.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const hasPerm = await hasPermission(userId, permission);
      if (!hasPerm) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};

const requireAdmin = async (req, res, next) => {
  try {
    let userId = req.body.userId;
    console.log(
      "userId",
      userId,
      "req.headers.authorization",
      req.headers.authorization
    );

    if (!userId && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        userId = authHeader.substring(7);
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Admin check failed" });
  }
};

export {
  getUserFromRequest,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdmin,
  requirePermission,
  requireAdmin,
};
