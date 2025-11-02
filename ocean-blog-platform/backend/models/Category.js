const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    trim: true,
    unique: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters'],
    default: ''
  },
  color: {
    type: String,
    default: '#26A69A',
    validate: {
      validator: function(v) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    default: 'folder'
  },
  image: {
    type: String,
    default: ''
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  postCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for URL
categorySchema.virtual('url').get(function() {
  return `/categories/${this.slug}`;
});

// Virtual for depth level
categorySchema.virtual('level').get(function() {
  let level = 0;
  let current = this.parent;
  while (current) {
    level++;
    current = current.parent;
  }
  return level;
});

// Virtual for has children
categorySchema.virtual('hasChildren').get(function() {
  return this.children && this.children.length > 0;
});

// Index for better query performance
categorySchema.index({ slug: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ isFeatured: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ postCount: -1 });
categorySchema.index({ createdAt: -1 });

// Text index for search
categorySchema.index({
  name: 'text',
  description: 'text'
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  // Generate slug from name
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  
  next();
});

// Pre-save middleware to manage hierarchy
categorySchema.pre('save', async function(next) {
  if (this.isModified('parent')) {
    const oldParentId = this.isModified('parent') ? this.parent : null;
    const newParentId = this.parent;
    
    try {
      // Remove from old parent's children
      if (oldParentId) {
        await this.constructor.findByIdAndUpdate(oldParentId, {
          $pull: { children: this._id }
        });
      }
      
      // Add to new parent's children
      if (newParentId) {
        await this.constructor.findByIdAndUpdate(newParentId, {
          $addToSet: { children: this._id }
        });
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Post-save middleware to update post count
categorySchema.post('save', async function(doc) {
  if (doc.isActive) {
    const Post = mongoose.model('Post');
    const postCount = await Post.countDocuments({
      category: doc._id,
      status: 'published',
      isPublic: true
    });
    
    await this.constructor.findByIdAndUpdate(doc._id, { postCount });
  }
});

// Pre-remove middleware to clean up references
categorySchema.pre('remove', async function(next) {
  try {
    // Remove from parent's children array
    if (this.parent) {
      await this.constructor.findByIdAndUpdate(this.parent, {
        $pull: { children: this._id }
      });
    }
    
    // Update all child categories to have no parent
    await this.constructor.updateMany(
      { parent: this._id },
      { $unset: { parent: 1 } }
    );
    
    // Set category to null for all posts in this category
    await mongoose.model('Post').updateMany(
      { category: this._id },
      { $unset: { category: 1 } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to update post count
categorySchema.methods.updatePostCount = async function() {
  try {
    const Post = mongoose.model('Post');
    const count = await Post.countDocuments({
      category: this._id,
      status: 'published',
      isPublic: true
    });
    
    this.postCount = count;
    return this.save();
  } catch (error) {
    throw error;
  }
};

// Instance method to get posts in this category
categorySchema.methods.getPosts = function(options = {}) {
  const Post = mongoose.model('Post');
  return Post.find({
    category: this._id,
    status: 'published',
    isPublic: true
  })
  .populate('author', 'name email avatar')
  .sort({ publishedAt: -1 });
};

// Instance method to check if it's a root category
categorySchema.methods.isRoot = function() {
  return !this.parent;
};

// Instance method to get full path
categorySchema.methods.getFullPath = function() {
  const path = [this.name];
  let current = this.parent;
  const pathComponents = [];
  
  while (current) {
    pathComponents.unshift(current.name);
    current = current.parent;
  }
  
  return pathComponents.join(' > ') + (pathComponents.length > 0 ? ' > ' : '') + this.name;
};

// Static method to find active categories
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .populate('parent', 'name slug')
    .sort({ sortOrder: 1, name: 1 });
};

// Static method to find featured categories
categorySchema.statics.findFeatured = function(limit = 5) {
  return this.find({ isActive: true, isFeatured: true })
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit);
};

// Static method to find root categories
categorySchema.statics.findRoots = function() {
  return this.find({ isActive: true, parent: { $exists: false } })
    .sort({ sortOrder: 1, name: 1 });
};

// Static method to build category tree
categorySchema.statics.buildTree = async function() {
  const categories = await this.find({ isActive: true })
    .populate('parent', 'name slug')
    .sort({ sortOrder: 1, name: 1 });
  
  const categoryMap = {};
  const rootCategories = [];
  
  // Create map for quick lookup
  categories.forEach(category => {
    categoryMap[category._id] = { ...category.toJSON(), children: [] };
  });
  
  // Build tree structure
  categories.forEach(category => {
    if (category.parent) {
      const parentId = category.parent._id || category.parent;
      if (categoryMap[parentId]) {
        categoryMap[parentId].children.push(categoryMap[category._id]);
      }
    } else {
      rootCategories.push(categoryMap[category._id]);
    }
  });
  
  return rootCategories;
};

// Static method for search
categorySchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true
  };
  
  const projection = {
    score: { $meta: 'textScore' }
  };
  
  return this.find(query, projection)
    .populate('parent', 'name slug')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Static method to get categories with post count
categorySchema.statics.findWithPostCount = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $lookup: {
        from: 'posts',
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$category', '$$categoryId'] },
              status: 'published',
              isPublic: true
            }
          }
        ],
        as: 'posts'
      }
    },
    {
      $addFields: {
        postCount: { $size: '$posts' }
      }
    },
    {
      $sort: { postCount: -1, name: 1 }
    }
  ]);
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;