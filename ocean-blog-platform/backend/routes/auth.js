const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const { 
  authenticate, 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../middleware/auth');
const { 
  validateRegister, 
  validateLogin, 
  validateForgotPassword, 
  validateResetPassword,
  handleValidationErrors 
} = require('../middleware/validation');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../utils/email');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: 'fail',
      message: 'User with this email already exists'
    });
  }

  // Create new user
  const user = new User({
    name,
    email,
    password
  });

  // Save user
  await user.save();

  // Generate tokens
  const authToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  await user.save();

  // Send welcome email (if email service is configured)
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (error) {
    console.log('Welcome email could not be sent:', error.message);
  }

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        createdAt: user.createdAt
      },
      token: authToken,
      refreshToken
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid email or password'
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    return res.status(423).json({
      status: 'fail',
      message: 'Account temporarily locked due to too many failed login attempts'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      status: 'fail',
      message: 'Account is deactivated'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    // Increment login attempts
    await user.incLoginAttempts();
    
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid email or password'
    });
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.updateOne({
      $unset: { loginAttempts: 1, lockUntil: 1 }
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const authToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  await user.save();

  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      token: authToken,
      refreshToken
    }
  });
}));

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      status: 'fail',
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'fail',
        message: 'Account is deactivated'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(tokenObj => tokenObj.token === refreshToken);
    
    if (!tokenExists) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid refresh token'
      });
    }

    // Clean up expired refresh tokens
    user.cleanupRefreshTokens();

    // Generate new tokens
    const newAuthToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();
    
    await user.save();

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token: newAuthToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired refresh token'
    });
  }
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const user = req.user;

  // Remove specific refresh token if provided
  if (refreshToken) {
    user.removeRefreshToken(refreshToken);
    await user.save();
  } else {
    // Clear all refresh tokens
    user.refreshTokens = [];
    await user.save();
  }

  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    status: 'success',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        socialLinks: user.socialLinks,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    }
  });
}));

// @desc    Send email verification
// @route   POST /api/auth/send-verification
// @access  Private
router.post('/send-verification', authenticate, asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.isEmailVerified) {
    return res.status(400).json({
      status: 'fail',
      message: 'Email is already verified'
    });
  }

  // Generate verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Send verification email
  try {
    await emailService.sendEmailVerification(user, verificationToken);
    
    res.json({
      status: 'success',
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: 'Could not send verification email'
    });
  }
}));

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      status: 'fail',
      message: 'Verification token is required'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid verification token'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is already verified'
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        status: 'fail',
        message: 'Verification token has expired'
      });
    }
    
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid verification token'
    });
  }
}));

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', validateForgotPassword, asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Get user based on email
  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if user exists or not for security
    return res.json({
      status: 'success',
      message: 'If a user with that email exists, we have sent a password reset link'
    });
  }

  // Generate password reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // Send reset email
  try {
    await emailService.sendPasswordReset(user, resetToken);
    
    res.json({
      status: 'success',
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    return res.status(500).json({
      status: 'fail',
      message: 'Could not send password reset email'
    });
  }
}));

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', validateResetPassword, asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid reset token'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if token is still valid
    if (!user.passwordResetToken || user.passwordResetToken !== token) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token has expired
    if (user.passwordResetExpires < Date.now()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Reset token has expired'
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Clear all refresh tokens
    
    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid or expired reset token'
    });
  }
}));

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
router.patch('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: 'fail',
      message: 'Current password and new password are required'
    });
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      status: 'fail',
      message: 'Current password is incorrect'
    });
  }

  // Set new password
  user.password = newPassword;
  user.refreshTokens = []; // Clear all refresh tokens for security
  
  await user.save();

  res.json({
    status: 'success',
    message: 'Password changed successfully'
  });
}));

module.exports = router;