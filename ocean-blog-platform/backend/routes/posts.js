const express = require('express');
const router = express.Router();

const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const { authenticate, optionalAuth, checkOwnership, authorize } = require('../middleware/auth');
const { 
  validateCreatePost, 
  validateUpdatePost, 
  validateMongoId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all published posts
// @route   GET /api/posts
// @access  Public
router.get('/', validatePagination, optionalAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sort = req.query.sort || '-publishedAt';
  const category = req.query.category;
  const author = req.query.author;
  const search = req.query.search;

  // Build query
  const query = {
    status: 'published',
    isPublic: true
  };

  if (category) {
    query.category = category;
  }

  if (author) {
    query.author = author;
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Execute query
  const posts = await Post.find(query)
    .populate('author', 'name email avatar bio')
    .populate('category', 'name slug color')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  // Get total count for pagination
  const total = await Post.countDocuments(query);

  // Get unique authors for filter
  const authors = await User.find({ role: 'user' })
    .select('name email avatar')
    .sort('name');

  // Get categories for filter
  const categories = await Category.findActive();

  res.json({
    status: 'success',
    results: posts.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    },
    data: {
      posts,
      filters: {
        authors,
        categories
      }
    }
  });
}));

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
router.get('/:id', validateMongoId, optionalAuth, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'name email avatar bio website')
    .populate('category', 'name slug color')
    .populate({
      path: 'comments',
      match: { status: 'approved', isDeleted: false },
      populate: {
        path: 'author',
        select: 'name email avatar'
      },
      options: {
        sort: { createdAt: 1 }
      }
    });

  if (!post) {
    return res.status(404).json({
      status: 'fail',
      message: 'Post not found'
    });
  }

  // Check if post is published and public
  if (post.status !== 'published' || !post.isPublic) {
    // Allow author or admin to view unpublished posts
    if (!req.user || (req.user._id.toString() !== post.author._id.toString() && req.user.role !== 'admin')) {
      return res.status(404).json({
        status: 'fail',
        message: 'Post not found'
      });
    }
  }

  // Increment views if not the author
  if (!req.user || req.user._id.toString() !== post.author._id.toString()) {
    await post.incrementViews();
  }

  res.json({
    status: 'success',
    data: {
      post
    }
  });
}));

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
router.post('/', authenticate, validateCreatePost, handleValidationErrors, asyncHandler(async (req, res) => {
  // Add author to post data
  req.body.author = req.user._id;

  // If category is provided, verify it exists
  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({
        status: 'fail',
        message: 'Category not found'
      });
    }
  }

  const post = new Post(req.body);
  await post.save();

  // Populate author and category for response
  await post.populate('author', 'name email avatar')
    .populate('category', 'name slug color');

  res.status(201).json({
    status: 'success',
    message: 'Post created successfully',
    data: {
      post
    }
  });
}));

// @desc    Update post
// @route   PATCH /api/posts/:id
// @access  Private
router.patch('/:id', 
  validateMongoId, 
  authenticate, 
  validateUpdatePost, 
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'fail',
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to update this post'
      });
    }

    // If category is provided, verify it exists
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(400).json({
          status: 'fail',
          message: 'Category not found'
        });
      }
    }

    // Update post
    Object.assign(post, req.body);
    await post.save();

    // Populate author and category for response
    await post.populate('author', 'name email avatar')
      .populate('category', 'name slug color');

    res.json({
      status: 'success',
      message: 'Post updated successfully',
      data: {
        post
      }
    });
  })
);

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
router.delete('/:id', 
  validateMongoId, 
  authenticate, 
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'fail',
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to delete this post'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  })
);

// @desc    Toggle like on post
// @route   POST /api/posts/:id/like
// @access  Private
router.post('/:id/like', validateMongoId, authenticate, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      status: 'fail',
      message: 'Post not found'
    });
  }

  if (!post.allowLikes) {
    return res.status(400).json({
      status: 'fail',
      message: 'Likes are not allowed on this post'
    });
  }

  await post.toggleLike(req.user._id);

  res.json({
    status: 'success',
    message: post.likedBy.includes(req.user._id) ? 'Post liked' : 'Post unliked',
    data: {
      likes: post.likes,
      dislikedBy: post.dislikedBy,
      likedBy: post.likedBy
    }
  });
}));

// @desc    Toggle dislike on post
// @route   POST /api/posts/:id/dislike
// @access  Private
router.post('/:id/dislike', validateMongoId, authenticate, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      status: 'fail',
      message: 'Post not found'
    });
  }

  await post.toggleDislike(req.user._id);

  res.json({
    status: 'success',
    message: post.dislikedBy.includes(req.user._id) ? 'Post disliked' : 'Post undisliked',
    data: {
      dislikes: post.dislikes,
      likedBy: post.likedBy,
      dislikedBy: post.dislikedBy
    }
  });
}));

// @desc    Get user's posts
// @route   GET /api/posts/user/me
// @access  Private
router.get('/user/me', authenticate, validatePagination, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sort = req.query.sort || '-createdAt';
  const status = req.query.status;

  const query = { author: req.user._id };

  if (status && ['draft', 'published', 'archived'].includes(status)) {
    query.status = status;
  }

  const posts = await Post.find(query)
    .populate('category', 'name slug color')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Post.countDocuments(query);

  res.json({
    status: 'success',
    results: posts.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    },
    data: {
      posts
    }
  });
}));

// @desc    Get featured posts
// @route   GET /api/posts/featured
// @access  Public
router.get('/featured', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const posts = await Post.findFeatured(limit);

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts
    }
  });
}));

// @desc    Search posts
// @route   GET /api/posts/search
// @access  Public
router.get('/search', validatePagination, asyncHandler(async (req, res) => {
  const { q: searchTerm, category, tag } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (!searchTerm && !category && !tag) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide search term, category, or tag'
    });
  }

  let posts;
  let total;

  if (searchTerm) {
    const result = await Post.search(searchTerm, { limit });
    posts = result.slice((page - 1) * limit, page * limit);
    total = result.length;
  } else if (category) {
    posts = await Post.findByCategory(category, { limit });
    total = posts.length;
    posts = posts.slice((page - 1) * limit, page * limit);
  } else if (tag) {
    posts = await Post.findByTag(tag, { limit });
    total = posts.length;
    posts = posts.slice((page - 1) * limit, page * limit);
  }

  res.json({
    status: 'success',
    results: posts.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    },
    data: {
      posts
    }
  });
}));

module.exports = router;