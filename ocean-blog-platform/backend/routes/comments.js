const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { authenticate } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Get all comments
router.get('/', asyncHandler(async (req, res) => {
  const comments = await Comment.find().sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    results: comments.length,
    data: comments
  });
}));

// Get single comment
router.get('/:id', asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }
  res.status(200).json({
    status: 'success',
    data: comment
  });
}));

// Create comment
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { content, postId, parentId } = req.body;
  
  const commentData = {
    content,
    post: postId,
    author: req.user._id
  };

  if (parentId) {
    commentData.parent = parentId;
  }

  const comment = await Comment.create(commentData);
  await comment.populate('author', 'name email');
  
  res.status(201).json({
    status: 'success',
    data: comment
  });
}));

// Update comment
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to update this comment', 403);
  }

  comment.content = req.body.content;
  await comment.save();
  await comment.populate('author', 'name email');
  
  res.status(200).json({
    status: 'success',
    data: comment
  });
}));

// Delete comment
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to delete this comment', 403);
  }

  await comment.deleteOne();
  
  res.status(200).json({
    status: 'success',
    message: 'Comment deleted successfully'
  });
}));

// Like comment
router.post('/:id/like', authenticate, asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.likes.includes(req.user._id)) {
    comment.likes.pull(req.user._id);
  } else {
    comment.likes.push(req.user._id);
  }

  await comment.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      likes: comment.likes.length,
      liked: comment.likes.includes(req.user._id)
    }
  });
}));

module.exports = router;