const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Please provide comment content'],
    trim: true,
    maxlength: [1000, 'Comment cannot be more than 1000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    select: false
  },
  user: {
    type: String,
    select: false
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'off-topic', 'other'],
      required: true
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for is reply
commentSchema.virtual('isReply').get(function() {
  return !!this.parentComment;
});

// Index for better query performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ createdAt: -1 });

// Instance method to toggle like
commentSchema.methods.toggleLike = function(userId) {
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
commentSchema.methods.toggleDislike = function(userId) {
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

// Instance method to edit comment
commentSchema.methods.editComment = function(newContent) {
  // Save current content to history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });
  
  // Update content
  this.content = newContent;
  this.isEdited = true;
  
  return this.save();
};

// Instance method to soft delete
commentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[Comment deleted]';
  return this.save();
};

// Instance method to restore
commentSchema.methods.restore = function() {
  if (this.editHistory.length > 0) {
    this.content = this.editHistory[this.editHistory.length - 1].content;
  }
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

// Instance method to report comment
commentSchema.methods.report = function(userId, reason, description = '') {
  // Check if user already reported
  const existingReport = this.reports.find(
    report => report.reportedBy.toString() === userId.toString()
  );
  
  if (existingReport) {
    throw new Error('You have already reported this comment');
  }
  
  this.reports.push({
    reportedBy: userId,
    reason,
    description
  });
  
  return this.save();
};

// Instance method to get report count
commentSchema.methods.getReportCount = function() {
  return this.reports.length;
};

// Static method to find comments by post
commentSchema.statics.findByPost = function(postId, options = {}) {
  const query = { 
    post: postId,
    status: 'approved',
    isDeleted: false
  };
  
  if (options.parentOnly) {
    query.parentComment = { $exists: false };
  }
  
  return this.find(query)
    .populate('author', 'name email avatar')
    .populate({
      path: 'replies',
      match: { status: 'approved', isDeleted: false },
      populate: {
        path: 'author',
        select: 'name email avatar'
      }
    })
    .sort({ createdAt: 1 }); // Oldest first for comments
};

// Static method to find replies to a comment
commentSchema.statics.findReplies = function(commentId) {
  return this.find({
    parentComment: commentId,
    status: 'approved',
    isDeleted: false
  })
  .populate('author', 'name email avatar')
  .sort({ createdAt: 1 });
};

// Static method to find comments by author
commentSchema.statics.findByAuthor = function(authorId, options = {}) {
  const query = { author: authorId };
  if (options.status) query.status = options.status;
  if (options.post) query.post = options.post;
  
  return this.find(query)
    .populate('post', 'title slug')
    .populate('parentComment', 'content')
    .sort({ createdAt: -1 });
};

// Static method to find pending comments (for moderation)
commentSchema.statics.findPending = function(options = {}) {
  const query = { 
    status: 'pending',
    isDeleted: false
  };
  
  return this.find(query)
    .populate('author', 'name email')
    .populate('post', 'title slug author')
    .sort({ createdAt: -1 });
};

// Static method to get comment statistics
commentSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to find reported comments
commentSchema.statics.findReported = function() {
  return this.find({
    reports: { $exists: true, $ne: [] },
    isDeleted: false
  })
  .populate('author', 'name email')
  .populate('post', 'title slug')
  .populate('reports.reportedBy', 'name email')
  .sort({ 'reports.reportedAt': -1 });
};

// Pre-save middleware to add reply reference to parent
commentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentComment) {
    try {
      await this.constructor.findByIdAndUpdate(this.parentComment, {
        $push: { replies: this._id }
      });
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-remove middleware to clean up references
commentSchema.pre('remove', async function(next) {
  try {
    // Remove from parent's replies array
    if (this.parentComment) {
      await this.constructor.findByIdAndUpdate(this.parentComment, {
        $pull: { replies: this._id }
      });
    }
    
    // Remove all replies
    await this.constructor.deleteMany({ parentComment: this._id });
    
    // Remove from post's comments array
    await mongoose.model('Post').findByIdAndUpdate(this.post, {
      $pull: { comments: this._id }
    });
    
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to update post comment count
commentSchema.post('save', async function(doc) {
  if (doc.status === 'approved' && !doc.isDeleted) {
    await mongoose.model('Post').findByIdAndUpdate(doc.post, {
      $addToSet: { comments: doc._id }
    });
  }
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;