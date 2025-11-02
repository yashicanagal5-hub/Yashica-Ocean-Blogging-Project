// Slugify utility for creating URL-friendly strings
const slugify = (text, options = {}) => {
  if (!text) return '';
  
  const defaultOptions = {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
    locale: 'en'
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Remove HTML entities
  let slug = text
    .toString()
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');
  
  // Remove special characters
  if (mergedOptions.remove) {
    slug = slug.replace(new RegExp(mergedOptions.remove, 'g'), '');
  }
  
  // Convert to lowercase
  if (mergedOptions.lower) {
    slug = slug.toLowerCase();
  }
  
  // Remove accent marks
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace multiple hyphens with single hyphen
  slug = slug.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  slug = slug.replace(/^-|-$/g, '');
  
  // Limit length
  if (mergedOptions.maxLength) {
    slug = slug.slice(0, mergedOptions.maxLength);
    // Remove trailing hyphen if truncated
    slug = slug.replace(/-+$/g, '');
  }
  
  return slug;
};

// Generate unique slug
const generateUniqueSlug = async (Model, text, excludeId = null) => {
  let baseSlug = slugify(text);
  let slug = baseSlug;
  let counter = 1;
  
  // Keep trying until we find a unique slug
  while (true) {
    const query = Model.findOne({ slug });
    if (excludeId) {
      query.where('_id').ne(excludeId);
    }
    
    const existing = await query.exec();
    if (!existing) {
      return slug;
    }
    
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
};

// Format date for display
const formatDate = (date, format = 'medium') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  const formats = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    medium: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    relative: 'relative'
  };
  
  const options = formats[format];
  if (options === 'relative') {
    return getRelativeTime(d);
  }
  
  return d.toLocaleDateString('en-US', options);
};

// Get relative time (e.g., "2 hours ago")
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'just now';
};

// Truncate text
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length).trim() + suffix;
};

// Extract plain text from HTML
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

// Calculate reading time
const calculateReadingTime = (text, wordsPerMinute = 200) => {
  if (!text) return 0;
  
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

// Generate excerpt
const generateExcerpt = (content, maxLength = 300) => {
  const plainText = stripHtml(content);
  return truncateText(plainText, maxLength);
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sanitize string
const sanitizeString = (str) => {
  if (!str) return '';
  
  return str
    .toString()
    .trim()
    .replace(/[<>]/g, '') // Remove < and > characters
    .substring(0, 500); // Limit length
};

// Generate random string
const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if string is valid hex color
const isValidHexColor = (color) => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

// Convert bytes to base64
const bytesToBase64 = (buffer) => {
  return buffer.toString('base64');
};

// Base64 to bytes
const base64ToBytes = (base64) => {
  return Buffer.from(base64, 'base64');
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Remove duplicates from array
const removeDuplicates = (array, key) => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const k = item[key];
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
};

// Paginate results
const paginate = (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  return {
    ...query,
    skip,
    limit: parseInt(limit)
  };
};

// Create pagination metadata
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

module.exports = {
  slugify,
  generateUniqueSlug,
  formatDate,
  getRelativeTime,
  truncateText,
  stripHtml,
  calculateReadingTime,
  generateExcerpt,
  isValidEmail,
  validatePassword,
  sanitizeString,
  generateRandomString,
  formatFileSize,
  isValidHexColor,
  bytesToBase64,
  base64ToBytes,
  debounce,
  deepClone,
  removeDuplicates,
  paginate,
  createPaginationMeta
};