import nodemailer from 'nodemailer';

interface SellerCredentialsEmail {
  to: string;
  sellerName: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
}

interface PasswordResetOTPEmail {
  to: string;
  sellerName: string;
  otp: string;
}

interface EmailVerificationOTP {
  to: string;
  otp: string;
  purpose: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send seller credentials via email
   */
  async sendSellerCredentials(data: SellerCredentialsEmail): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@shambit.com',
      to: data.to,
      subject: 'Welcome to ShamBit - Your Seller Account is Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Welcome to ShamBit Seller Portal!</h2>
          
          <p>Dear ${data.sellerName},</p>
          
          <p>Congratulations! Your seller account has been approved and is now active.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Your Login Credentials:</h3>
            <p><strong>Username:</strong> ${data.username}</p>
            <p><strong>Email:</strong> ${data.to}</p>
            <p><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;">${data.tempPassword}</code></p>
            <p><strong>Login URL:</strong> <a href="${data.loginUrl}">${data.loginUrl}</a></p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
          </div>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Visit the seller portal using the link above</li>
            <li>Login with your email and temporary password</li>
            <li>Complete the OTP verification</li>
            <li>Change your password</li>
            <li>Start adding your products!</li>
          </ol>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>The ShamBit Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send password reset OTP via email
   */
  async sendPasswordResetOTP(data: PasswordResetOTPEmail): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@shambit.com',
      to: data.to,
      subject: 'Password Reset OTP - ShamBit Seller Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Password Reset Request</h2>
          
          <p>Dear ${data.sellerName},</p>
          
          <p>You have requested to reset your password for your ShamBit seller account.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <h3>Your OTP Code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2c5aa0; letter-spacing: 3px;">${data.otp}</p>
            <p style="color: #6c757d; font-size: 14px;">This OTP is valid for 10 minutes</p>
          </div>
          
          <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545;">
            <p><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email and contact our support team immediately.</p>
          </div>
          
          <p>Best regards,<br>The ShamBit Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send email verification OTP
   */
  async sendOTP(data: EmailVerificationOTP): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@shambit.com',
      to: data.to,
      subject: 'Email Verification OTP - ShamBit Seller Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Email Verification</h2>
          
          <p>Thank you for registering with ShamBit!</p>
          
          <p>Please use the following OTP to verify your email address:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <h3>Your OTP Code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2c5aa0; letter-spacing: 3px;">${data.otp}</p>
            <p style="color: #6c757d; font-size: 14px;">This OTP is valid for 5 minutes</p>
          </div>
          
          <p><strong>Purpose:</strong> ${data.purpose}</p>
          
          <p>If you did not request this verification, please ignore this email.</p>
          
          <p>Best regards,<br>The ShamBit Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send general notification email
   */
  async sendNotification(to: string, subject: string, message: string): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@shambit.com',
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">ShamBit Notification</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            ${message}
          </div>
          <p>Best regards,<br>The ShamBit Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

export const emailService = new EmailService();