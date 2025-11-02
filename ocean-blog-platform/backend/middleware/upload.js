const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Determine upload path based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audios/';
    } else {
      uploadPath += 'documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    
    cb(null, `${baseName}-${uniqueSuffix}${fileExtension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ];
  
  const allowedVideoTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo'
  ];
  
  const allowedAudioTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/aac'
  ];
  
  const allAllowedTypes = [
    ...allowedImageTypes,
    ...allowedDocumentTypes,
    ...allowedVideoTypes,
    ...allowedAudioTypes
  ];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Specific upload configurations
const uploadImage = upload.single('image');
const uploadMultipleImages = upload.array('images', 5);
const uploadDocument = upload.single('document');
const uploadAnyFile = upload.single('file');

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'fail',
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'fail',
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'fail',
        message: 'Unexpected file field.'
      });
    }
    
    return res.status(400).json({
      status: 'fail',
      message: `Upload error: ${err.message}`
    });
  }
  
  // Handle custom file type errors
  if (err.message.includes('File type') && err.message.includes('not allowed')) {
    return res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
  
  next(err);
};

// Get file info helper
const getFileInfo = (file) => {
  const fileExtension = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, fileExtension);
  
  return {
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileSize: file.size,
    fileType: file.mimetype,
    fileExtension: fileExtension.toLowerCase(),
    baseName: baseName
  };
};

// Validate image dimensions (optional)
const validateImageDimensions = (width, height) => {
  return (req, res, next) => {
    // This would require additional image processing library like sharp
    // For now, just pass through
    next();
  };
};

// Generate file URL based on storage type
const generateFileUrl = (file, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  if (file.mimetype.startsWith('image/')) {
    return `${baseUrl}/uploads/images/${file.filename}`;
  } else if (file.mimetype.startsWith('video/')) {
    return `${baseUrl}/uploads/videos/${file.filename}`;
  } else if (file.mimetype.startsWith('audio/')) {
    return `${baseUrl}/uploads/audios/${file.filename}`;
  } else {
    return `${baseUrl}/uploads/documents/${file.filename}`;
  }
};

module.exports = {
  upload,
  uploadImage,
  uploadMultipleImages,
  uploadDocument,
  uploadAnyFile,
  handleMulterError,
  getFileInfo,
  validateImageDimensions,
  generateFileUrl
};