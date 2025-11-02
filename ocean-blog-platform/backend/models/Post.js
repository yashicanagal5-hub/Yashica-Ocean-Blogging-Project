const mongoose = require('mongoose');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Please provide content'],
    maxlength: [50000, 'Content cannot be more than 50,000 characters']
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot be more than 300 characters'],
    default: ''
  },
  featuredImage: {
    type: String,
    default: ''
  },
  images: [{
    url: String,
    caption: String,
    altText: String
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  readingTime: {
    type: Number, // in minutes
    default: 0
  },
  wordCount: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot be more than 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot be more than 160 characters']
    },
    keywords: [String]
  },
  featured: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowLikes: {
    type: Boolean,
    default: true
  },
  shareCount: {
    type: Number,
    default: 0
  },
  shares: {
    facebook: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    linkedin: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for URL
postSchema.virtual('url').get(function() {
  return `/posts/${this.slug}`;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for is published
postSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.publishedAt;
});

// Index for better query performance
postSchema.index({ slug: 1 });
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ status: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ featured: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ views: -1 });
postSchema.index({ likes: -1 });

// Text index for search
postSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text'
});

// Pre-save middleware to generate slug
postSchema.pre('save', function(next) {
  // Generate slug from title
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  
  // Calculate word count and reading time
  if (this.isModified('content')) {
    this.wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(this.wordCount / 200); // Assuming 200 words per minute
    
    // Generate excerpt if not provided
    if (!this.excerpt) {
      const plainText = this.content.replace(/<[^>]*>/g, ''); // Remove HTML tags
      this.excerpt = plainText.substring(0, 300) + (plainText.length > 300 ? '...' : '');
    }
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Pre-save middleware to update updatedAt
postSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Instance method to increment views
postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to toggle like
postSchema.methods.toggleLike = function(userId) {
  const userIdStr = userId.toString();
  const likedIndex = this.likedBy.findIndex(id => id.toString() === userIdStr);
  const dislikedIndex = this.dislikedBy.findIndex(id => id.toString() === userIdStr);
  
  if (likedIndex > -1) {
    // User already liked, remove like
    this.likedBy.splice(likedIndex, 1);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    // Add like
    this.likedBy.push(userId);
    this.likes += 1;
    
    // Remove from disliked if exists
    if (dislikedIndex > -1) {
      this.dislikedBy.splice(dislikedIndex, 1);
      this.dislikes = Math.max(0, this.dislikes - 1);
    }
  }
  
  return this.save();
};

// Instance method to toggle dislike
postSchema.methods.toggleDislike = function(userId) {
  const userIdStr = userId.toString();
  const likedIndex = this.likedBy.findIndex(id => id.toString() === userIdStr);
  const dislikedIndex = this.dislikedBy.findIndex(id => id.toString() === userIdStr);
  
  if (dislikedIndex > -1) {
    // User already disliked, remove dislike
    this.dislikedBy.splice(dislikedIndex, 1);
    this.dislikes = Math.max(0, this.dislikes - 1);
  } else {
    // Add dislike
    this.dislikedBy.push(userId);
    this.dislikes += 1;
    
    // Remove from liked if exists
    if (likedIndex > -1) {
      this.likedBy.splice(likedIndex, 1);
      this.likes = Math.max(0, this.likes - 1);
    }
  }
  
  return this.save();
};

// Instance method to increment share count
postSchema.methods.incrementShare = function(platform) {
  if (this.shares.hasOwnProperty(platform)) {
    this.shares[platform] += 1;
  } else {
    this.shares.other += 1;
  }
  this.shareCount += 1;
  return this.save();
};

// Static method to find published posts
postSchema.statics.findPublished = function() {
  return this.find({ status: 'published', isPublic: true })
    .populate('author', 'name email avatar')
    .populate('category', 'name color');
};

// Static method to find featured posts
postSchema.statics.findFeatured = function(limit = 5) {
  return this.find({ status: 'published', featured: true, isPublic: true })
    .populate('author', 'name email avatar')
    .populate('category', 'name color')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to find posts by author
postSchema.statics.findByAuthor = function(authorId, options = {}) {
  const query = { author: authorId };
  if (options.status) query.status = options.status;
  if (options.category) query.category = options.category;
  
  return this.find(query)
    .populate('category', 'name color')
    .sort({ publishedAt: -1 });
};

// Static method for search
postSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'published',
    isPublic: true
  };
  
  const projection = {
    score: { $meta: 'textScore' }
  };
  
  return this.find(query, projection)
    .populate('author', 'name email avatar')
    .populate('category', 'name color')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Static method to get posts by category
postSchema.statics.findByCategory = function(categoryId, options = {}) {
  const query = {
    category: categoryId,
    status: 'published',
    isPublic: true
  };
  
  return this.find(query)
    .populate('author', 'name email avatar')
    .sort({ publishedAt: -1 });
};

// Static method to get posts by tag
postSchema.statics.findByTag = function(tag, options = {}) {
  const query = {
    tags: tag.toLowerCase(),
    status: 'published',
    isPublic: true
  };
  
  return this.find(query)
    .populate('author', 'name email avatar')
    .populate('category', 'name color')
    .sort({ publishedAt: -1 });
};

// Pre-remove middleware to clean up references
postSchema.pre('remove', async function(next) {
  try {
    // Remove all comments associated with this post
    await mongoose.model('Comment').deleteMany({ post: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;