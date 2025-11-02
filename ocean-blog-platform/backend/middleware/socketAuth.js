const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket.io authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    let token;

    // Try to get token from different sources
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.headers.authorization && socket.handshake.headers.authorization.startsWith('Bearer')) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    } else if (socket.handshake.query && socket.handshake.query.token) {
      token = socket.handshake.query.token;
    }

    if (!token) {
      console.log('⚠️ No token provided for socket connection');
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('⚠️ User not found for socket connection');
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      console.log('⚠️ Inactive user attempted socket connection');
      return next(new Error('Account is deactivated'));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.log('⚠️ Socket authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    return next(new Error('Authentication failed'));
  }
};

// Authorize socket based on roles
const authorizeSocket = (...roles) => {
  return (socket, next) => {
    if (!socket.user) {
      return next(new Error('Authentication required'));
    }

    if (!roles.includes(socket.user.role)) {
      return next(new Error('Insufficient permissions'));
    }

    next();
  };
};

// Check if user owns the resource or is admin
const checkSocketOwnership = (Model, ownerField = 'user') => {
  return async (socket, next) => {
    try {
      const resourceId = socket.handshake.query.resourceId;
      
      if (!resourceId) {
        return next(new Error('Resource ID required'));
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return next(new Error('Resource not found'));
      }

      // Check if user owns the resource or is admin
      if (resource[ownerField].toString() !== socket.user._id.toString() && socket.user.role !== 'admin') {
        return next(new Error('Not authorized to access this resource'));
      }

      socket.resource = resource;
      next();
    } catch (error) {
      return next(new Error('Error checking resource ownership'));
    }
  };
};

// Helper function to emit to specific users
const emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

// Helper function to emit to users in a room
const emitToRoom = (io, room, event, data) => {
  io.to(room).emit(event, data);
};

// Helper function to emit to all connected users
const emitToAll = (io, event, data) => {
  io.emit(event, data);
};

// Get connected users count
const getConnectedUsersCount = (io) => {
  return io.engine.clientsCount;
};

// Get users in a specific room
const getUsersInRoom = (io, room) => {
  const clients = io.sockets.adapter.rooms.get(room);
  return clients ? clients.size : 0;
};

// Validate socket event data
const validateSocketData = (schema) => {
  return (socket, next) => {
    const { error } = schema.validate(socket.handshake.auth || {});
    if (error) {
      return next(new Error(`Invalid data: ${error.details[0].message}`));
    }
    next();
  };
};

module.exports = {
  authenticateSocket,
  authorizeSocket,
  checkSocketOwnership,
  emitToUser,
  emitToRoom,
  emitToAll,
  getConnectedUsersCount,
  getUsersInRoom,
  validateSocketData
};