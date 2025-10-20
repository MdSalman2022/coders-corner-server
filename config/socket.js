const { Server } = require("socket.io");

/**
 * Socket.io Setup for Real-time Feed Updates
 * Implements WebSocket push for:
 * - New post notifications
 * - Like/comment notifications
 * - Follow notifications
 */

let io = null;

/**
 * Initialize Socket.io with HTTP server
 */
const initializeSocketio = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5000",
        process.env.CLIENT_URL,
      ],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Track active connections per user
  const userConnections = new Map();

  io.on("connection", (socket) => {
    console.log(`\n🔌 [Socket.io] User connected: ${socket.id}`);

    /**
     * Join user-specific room for personalized notifications
     */
    socket.on("join_user_room", (data) => {
      const { userId } = data;

      if (!userId) {
        console.log(`⚠️  No userId provided`);
        return;
      }

      // Join user-specific room
      const roomName = `user_${userId}`;
      socket.join(roomName);

      // Track connection
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(socket.id);

      console.log(`   ✅ Joined room: ${roomName}`);
      console.log(
        `   📊 Active sockets for ${userId}: ${
          userConnections.get(userId).size
        }`
      );

      // Send confirmation
      socket.emit("joined_user_room", { roomName, userId });
    });

    /**
     * Subscribe to feed updates (home feed, trending, etc.)
     */
    socket.on("subscribe_feed", (data) => {
      const { feedType = "home" } = data;
      const roomName = `feed_${feedType}`;

      socket.join(roomName);
      console.log(`   ✅ Subscribed to feed: ${roomName}`);
    });

    /**
     * Unsubscribe from feed
     */
    socket.on("unsubscribe_feed", (data) => {
      const { feedType = "home" } = data;
      const roomName = `feed_${feedType}`;

      socket.leave(roomName);
      console.log(`   ❌ Unsubscribed from feed: ${roomName}`);
    });

    /**
     * Handle disconnect
     */
    socket.on("disconnect", () => {
      console.log(`\n🔌 [Socket.io] User disconnected: ${socket.id}`);

      // Clean up user connections
      for (const [userId, sockets] of userConnections.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userConnections.delete(userId);
        }
      }
    });

    /**
     * Error handling
     */
    socket.on("error", (error) => {
      console.error(`   ❌ Socket error: ${error}`);
    });
  });

  console.log(`✅ Socket.io initialized\n`);
  return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

/**
 * Emit new post to all followers
 * Called by Outbox worker when post is created
 */
const emitNewPost = (postData, followerIds) => {
  try {
    if (!io) return;

    const payload = {
      type: "new_post",
      data: {
        postId: postData._id,
        title: postData.title,
        excerpt: postData.excerpt,
        coverImage: postData.coverImage,
        authorId: postData.author,
        authorName: postData.authorName,
        authorAvatar: postData.authorAvatar,
        tags: postData.tags,
        category: postData.category,
        createdAt: postData.createdAt,
      },
      timestamp: new Date(),
    };

    // Emit to each follower's room
    followerIds.forEach((followerId) => {
      const roomName = `user_${followerId}`;
      io.to(roomName).emit("feed_update", payload);
    });

    // Also broadcast to general feed rooms
    io.to("feed_home").emit("feed_update", payload);
    io.to("feed_discover").emit("feed_update", payload);

    console.log(
      `   📡 [Socket.io] Emitted new_post to ${followerIds.length} followers`
    );
  } catch (error) {
    console.error(`   ❌ [Socket.io] Error emitting new post:`, error);
  }
};

/**
 * Emit notification (like, comment, follow)
 */
const emitNotification = (userId, notification) => {
  try {
    if (!io) return;

    const roomName = `user_${userId}`;
    io.to(roomName).emit("notification", {
      type: notification.type,
      data: notification,
      timestamp: new Date(),
    });

    console.log(
      `   📬 [Socket.io] Sent ${notification.type} notification to ${userId}`
    );
  } catch (error) {
    console.error(`   ❌ [Socket.io] Error emitting notification:`, error);
  }
};

/**
 * Emit feed update (post updated or deleted)
 */
const emitFeedUpdate = (updateData) => {
  try {
    if (!io) return;

    const payload = {
      type: updateData.type, // 'post_updated' or 'post_deleted'
      data: updateData,
      timestamp: new Date(),
    };

    io.to("feed_home").emit("feed_update", payload);
    io.to("feed_discover").emit("feed_update", payload);

    console.log(`   📡 [Socket.io] Emitted ${updateData.type} event`);
  } catch (error) {
    console.error(`   ❌ [Socket.io] Error emitting feed update:`, error);
  }
};

/**
 * Get connected users count
 */
const getConnectedUsersCount = () => {
  if (!io) return 0;
  return io.engine.clientsCount;
};

/**
 * Get active sockets for a specific user
 */
const getUserSocketCount = (userId) => {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get(`user_${userId}`);
  return room ? room.size : 0;
};

module.exports = {
  initializeSocketio,
  getIO,
  emitNewPost,
  emitNotification,
  emitFeedUpdate,
  getConnectedUsersCount,
  getUserSocketCount,
};
