const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400), false);
    }
  }
});

// Upload single image
router.post('/image', authenticate, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  // Upload to Cloudinary
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ocean-blog',
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    stream.end(req.file.buffer);
  });

  res.status(200).json({
    status: 'success',
    data: {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    }
  });
}));

// Upload multiple images
router.post('/images', authenticate, upload.array('images', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No image files provided', 400);
  }

  // Upload all files to Cloudinary
  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ocean-blog',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      stream.end(file.buffer);
    });
  });

  const results = await Promise.all(uploadPromises);

  const uploadedImages = results.map(result => ({
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes
  }));

  res.status(200).json({
    status: 'success',
    results: uploadedImages.length,
    data: uploadedImages
  });
}));

// Delete image
router.delete('/image/:publicId', authenticate, asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    throw new AppError('Public ID is required', 400);
  }

  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result === 'ok') {
    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  } else {
    throw new AppError('Failed to delete image', 400);
  }
}));

module.exports = router;