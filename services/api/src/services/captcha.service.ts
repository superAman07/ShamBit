import axios from 'axios';
import crypto from 'crypto';

interface CaptchaResponse {
  captchaId: string;
  imageUrl: string;
  expiresIn: number;
}

class CaptchaService {
  private readonly RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
  private readonly RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

  /**
   * Verify reCAPTCHA token
   */
  async verifyCaptcha(token: string, remoteIp?: string): Promise<boolean> {
    try {
      if (!this.RECAPTCHA_SECRET) {
        console.warn('reCAPTCHA secret key not configured, skipping verification');
        return true; // Allow in development
      }

      const response = await axios.post(this.RECAPTCHA_VERIFY_URL, null, {
        params: {
          secret: this.RECAPTCHA_SECRET,
          response: token,
          remoteip: remoteIp,
        },
      });

      const data = response.data;
      
      // Check if verification was successful and score is acceptable (for v3)
      if (data.success) {
        // For reCAPTCHA v3, check score (0.0 to 1.0, higher is better)
        if (data.score !== undefined) {
          return data.score >= 0.5; // Adjust threshold as needed
        }
        return true; // For reCAPTCHA v2
      }

      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return false;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return false;
    }
  }

  /**
   * Generate simple math CAPTCHA (fallback)
   */
  async generateMathCaptcha(): Promise<CaptchaResponse> {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = Math.random() > 0.5 ? '+' : '-';
    
    let question: string;
    let answer: number;
    
    if (operation === '+') {
      question = `${num1} + ${num2}`;
      answer = num1 + num2;
    } else {
      // Ensure positive result for subtraction
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      question = `${larger} - ${smaller}`;
      answer = larger - smaller;
    }
    
    const captchaId = crypto.randomUUID();
    
    // Store answer in cache/database with expiry
    await this.storeCaptchaAnswer(captchaId, answer.toString());
    
    return {
      captchaId,
      imageUrl: this.generateMathCaptchaImage(question),
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Verify math CAPTCHA
   */
  async verifyMathCaptcha(captchaId: string, answer: string): Promise<boolean> {
    const storedAnswer = await this.getCaptchaAnswer(captchaId);
    
    if (!storedAnswer) {
      return false;
    }
    
    // Clean up after verification
    await this.deleteCaptchaAnswer(captchaId);
    
    return storedAnswer === answer.trim();
  }

  /**
   * Generate SVG image for math CAPTCHA
   */
  private generateMathCaptchaImage(question: string): string {
    const svg = `
      <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="60" fill="#f0f0f0" stroke="#ccc"/>
        <text x="100" y="35" font-family="Arial, sans-serif" font-size="24" 
              text-anchor="middle" fill="#333">${question} = ?</text>
        <!-- Add some noise lines for security -->
        <line x1="10" y1="15" x2="190" y2="45" stroke="#ddd" stroke-width="1"/>
        <line x1="20" y1="45" x2="180" y2="15" stroke="#ddd" stroke-width="1"/>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Store CAPTCHA answer (implement with your cache/database)
   */
  private async storeCaptchaAnswer(captchaId: string, answer: string): Promise<void> {
    const { getDatabase } = await import('@shambit/database');
    const db = getDatabase();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    await db('captcha_records').insert({
      captcha_id: captchaId,
      answer,
      expires_at: expiresAt,
      created_at: new Date(),
    });
  }

  /**
   * Get CAPTCHA answer
   */
  private async getCaptchaAnswer(captchaId: string): Promise<string | null> {
    const { getDatabase } = await import('@shambit/database');
    const db = getDatabase();
    
    const record = await db('captcha_records')
      .where('captcha_id', captchaId)
      .where('expires_at', '>', new Date())
      .first();
    
    return record?.answer || null;
  }

  /**
   * Delete CAPTCHA answer
   */
  private async deleteCaptchaAnswer(captchaId: string): Promise<void> {
    const { getDatabase } = await import('@shambit/database');
    const db = getDatabase();
    
    await db('captcha_records')
      .where('captcha_id', captchaId)
      .delete();
  }

  /**
   * Clean up expired CAPTCHA records
   */
  async cleanupExpiredCaptchas(): Promise<number> {
    const { getDatabase } = await import('@shambit/database');
    const db = getDatabase();
    
    const result = await db('captcha_records')
      .where('expires_at', '<', new Date())
      .delete();
    
    return result;
  }
}

export const captchaService = new CaptchaService();