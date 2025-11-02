const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Get user profile
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.status(200).json({
    status: 'success',
    data: user
  });
}));

// Update user profile
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { name, bio, avatar } = req.body;
  
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (name) user.name = name;
  if (bio) user.bio = bio;
  if (avatar) user.avatar = avatar;
  
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: user
  });
}));

// Get all users (admin only)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: users
  });
}));

// Get user by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.status(200).json({
    status: 'success',
    data: user
  });
}));

// Update user (admin only)
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { name, email, role, bio, avatar } = req.body;
  
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (bio) user.bio = bio;
  if (avatar) user.avatar = avatar;
  
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: user
  });
}));

// Delete user (admin only)
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.deleteOne();
  
  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully'
  });
}));

module.exports = router;