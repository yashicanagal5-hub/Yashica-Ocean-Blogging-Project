const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authenticate } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Get all categories
router.get('/', asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: categories
  });
}));

// Get single category
router.get('/:id', asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  res.status(200).json({
    status: 'success',
    data: category
  });
}));

// Create category
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  
  const category = await Category.create({
    name,
    description
  });
  
  res.status(201).json({
    status: 'success',
    data: category
  });
}));

// Update category
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  category.name = req.body.name || category.name;
  category.description = req.body.description || category.description;
  await category.save();
  
  res.status(200).json({
    status: 'success',
    data: category
  });
}));

// Delete category
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  await category.deleteOne();
  
  res.status(200).json({
    status: 'success',
    message: 'Category deleted successfully'
  });
}));

module.exports = router;