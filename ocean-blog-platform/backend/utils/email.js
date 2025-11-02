const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isEnabled = false;
    this.init();
  }

  init() {
    try {
      // Check if email configuration is available
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email service not configured - notifications will be disabled');
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      this.isEnabled = true;
      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
    }
  }

  async sendMail(options) {
    if (!this.isEnabled) {
      console.log('📧 Email not sent - service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        ...options
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully');
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const mailOptions = {
      to: user.email,
      subject: 'Welcome to Ocean Blog Platform! 🌊',
      html: this.generateWelcomeEmail(user)
    };

    return await this.sendMail(mailOptions);
  }

  // Send email verification
  async sendEmailVerification(user, token) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      to: user.email,
      subject: 'Verify Your Email - Ocean Blog Platform',
      html: this.generateEmailVerification(user, verificationUrl)
    };

    return await this.sendMail(mailOptions);
  }

  // Send password reset
  async sendPasswordReset(user, token) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      to: user.email,
      subject: 'Password Reset - Ocean Blog Platform',
      html: this.generatePasswordReset(user, resetUrl)
    };

    return await this.sendMail(mailOptions);
  }

  // Send comment notification
  async sendCommentNotification(postAuthor, commenter, post, comment) {
    const mailOptions = {
      to: postAuthor.email,
      subject: `New comment on your post: ${post.title}`,
      html: this.generateCommentNotification(postAuthor, commenter, post, comment)
    };

    return await this.sendMail(mailOptions);
  }

  // Send reply notification
  async sendReplyNotification(originalCommenter, replier, post, originalComment, reply) {
    const mailOptions = {
      to: originalCommenter.email,
      subject: `Someone replied to your comment`,
      html: this.generateReplyNotification(originalCommenter, replier, post, originalComment, reply)
    };

    return await this.sendMail(mailOptions);
  }

  // Generate welcome email template
  generateWelcomeEmail(user) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Ocean Blog Platform</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #26A69A, #00897B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #26A69A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌊 Welcome to Ocean Blog Platform!</h1>
      </div>
      <div class="content">
        <h2>Hi ${user.name},</h2>
        <p>Thank you for joining Ocean Blog Platform! We're thrilled to have you as part of our community.</p>
        
        <p>Here are some things you can do to get started:</p>
        <ul>
          <li>Create your first blog post</li>
          <li>Explore content from other writers</li>
          <li>Connect with fellow bloggers</li>
          <li>Join our community discussions</li>
        </ul>

        <a href="${process.env.CLIENT_URL}" class="button">Start Exploring</a>
        
        <p>If you have any questions or need help, feel free to reach out to our support team.</p>
        
        <p>Happy blogging!</p>
        <p>The Ocean Blog Team</p>
      </div>
      <div class="footer">
        <p>This email was sent to ${user.email}</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generate email verification template
  generateEmailVerification(user, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #26A69A, #00897B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #26A69A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📧 Verify Your Email</h1>
      </div>
      <div class="content">
        <h2>Hi ${user.name},</h2>
        <p>Thank you for registering with Ocean Blog Platform! To complete your registration and start blogging, please verify your email address.</p>
        
        <p>Click the button below to verify your email:</p>
        
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #e5e5e5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
        
        <p>This verification link will expire in 24 hours for security purposes.</p>
        
        <p>If you didn't create an account with Ocean Blog Platform, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generate password reset template
  generatePasswordReset(user, resetUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #26A69A, #00897B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #26A69A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Password Reset Request</h1>
      </div>
      <div class="content">
        <h2>Hi ${user.name},</h2>
        <p>We received a request to reset the password for your Ocean Blog Platform account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #e5e5e5; padding: 10px; border-radius: 5px;">${resetUrl}</p>
        
        <div class="warning">
          <p><strong>Security Notice:</strong></p>
          <ul>
            <li>This link will expire in 1 hour for security purposes</li>
            <li>If you didn't request a password reset, please ignore this email</li>
            <li>Your password will remain unchanged until you create a new one</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p>This email was sent to ${user.email}</p>
        <p>Ocean Blog Platform - Secure and Private</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generate comment notification template
  generateCommentNotification(postAuthor, commenter, post, comment) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Comment Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #26A69A, #00897B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #26A69A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .comment { background: white; padding: 15px; border-left: 4px solid #26A69A; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💬 New Comment</h1>
      </div>
      <div class="content">
        <h2>Hi ${postAuthor.name},</h2>
        <p><strong>${commenter.name}</strong> left a comment on your post:</p>
        
        <h3><a href="${process.env.CLIENT_URL}/posts/${post.slug}" style="color: #26A69A; text-decoration: none;">${post.title}</a></h3>
        
        <div class="comment">
          <p><strong>Comment:</strong></p>
          <p>${comment.content}</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL}/posts/${post.slug}#comments" class="button">View & Reply</a>
        </div>
        
        <p>Keep up the great work!</p>
      </div>
      <div class="footer">
        <p>Ocean Blog Platform Community</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generate reply notification template
  generateReplyNotification(originalCommenter, replier, post, originalComment, reply) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reply to Your Comment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #26A69A, #00897B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #26A69A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .comment { background: white; padding: 15px; margin: 15px 0; }
        .reply { background: #e8f5e8; padding: 15px; border-left: 4px solid #26A69A; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💬 New Reply</h1>
      </div>
      <div class="content">
        <h2>Hi ${originalCommenter.name},</h2>
        <p><strong>${replier.name}</strong> replied to your comment on:</p>
        
        <h3><a href="${process.env.CLIENT_URL}/posts/${post.slug}" style="color: #26A69A; text-decoration: none;">${post.title}</a></h3>
        
        <div class="comment">
          <p><strong>Your original comment:</strong></p>
          <p>${originalComment.content}</p>
        </div>
        
        <div class="reply">
          <p><strong>${replier.name}'s reply:</strong></p>
          <p>${reply.content}</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL}/posts/${post.slug}#comments" class="button">Join the Conversation</a>
        </div>
      </div>
      <div class="footer">
        <p>Ocean Blog Platform Community</p>
      </div>
    </body>
    </html>
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;