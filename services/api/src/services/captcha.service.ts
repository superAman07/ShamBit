import { getDatabase } from '@shambit/database';

interface CaptchaRecord {
  id: string;
  text: string;
  expiresAt: Date;
}

class CaptchaService {
  private readonly CAPTCHA_LENGTH = 5;
  private readonly EXPIRY_MINUTES = 5;

  /**
   * Generate a new CAPTCHA
   */
  async generateCaptcha(): Promise<{ captchaId: string; imageUrl: string; expiresIn: number }> {
    const db = getDatabase();
    
    // Generate random text
    const captchaText = this.generateRandomText();
    const captchaId = 'captcha_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRY_MINUTES);
    
    // Store in database
    await db('captcha_records').insert({
      id: captchaId,
      text: captchaText,
      expires_at: expiresAt,
      created_at: new Date()
    });
    
    // Generate image
    const imageUrl = this.generateCaptchaImage(captchaText);
    
    return {
      captchaId,
      imageUrl,
      expiresIn: this.EXPIRY_MINUTES * 60 // in seconds
    };
  }

  /**
   * Verify CAPTCHA
   */
  async verifyCaptcha(captchaId: string, userInput: string): Promise<boolean> {
    const db = getDatabase();
    
    if (!captchaId || !userInput) {
      return false;
    }
    
    // Get CAPTCHA record
    const record = await db('captcha_records')
      .where('id', captchaId)
      .first();
    
    if (!record) {
      return false;
    }
    
    // Check if expired
    if (new Date() > new Date(record.expires_at)) {
      // Clean up expired record
      await db('captcha_records').where('id', captchaId).delete();
      return false;
    }
    
    // Verify text (case-insensitive)
    const isValid = record.text.toLowerCase() === userInput.toLowerCase().trim();
    
    // Delete record after verification attempt (one-time use)
    await db('captcha_records').where('id', captchaId).delete();
    
    return isValid;
  }

  /**
   * Generate random text for CAPTCHA
   */
  private generateRandomText(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < this.CAPTCHA_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate CAPTCHA image using SVG
   */
  private generateCaptchaImage(text: string): string {
    return this.generateAdvancedSvgCaptcha(text);
  }

  /**
   * Generate advanced SVG CAPTCHA with noise and distortion
   */
  private generateAdvancedSvgCaptcha(text: string): string {
    const width = 200;
    const height = 80;
    const letters = text.split('');
    
    // Generate random colors
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    
    // Generate noise lines
    let noiseLines = '';
    for (let i = 0; i < 8; i++) {
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const x2 = Math.random() * width;
      const y2 = Math.random() * height;
      const color = colors[Math.floor(Math.random() * colors.length)];
      noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
    }
    
    // Generate noise circles
    let noiseCircles = '';
    for (let i = 0; i < 15; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const r = Math.random() * 3 + 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      noiseCircles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.4"/>`;
    }
    
    // Generate letters with random positions and rotations
    let letterElements = '';
    const letterWidth = width / letters.length;
    
    letters.forEach((letter, index) => {
      const x = letterWidth * index + letterWidth / 2;
      const y = height / 2 + (Math.random() - 0.5) * 15;
      const rotation = (Math.random() - 0.5) * 30; // degrees
      const color = colors[Math.floor(Math.random() * colors.length)];
      const fontSize = 28 + Math.random() * 8;
      
      letterElements += `
        <text x="${x}" y="${y}" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              font-weight="bold" 
              text-anchor="middle" 
              fill="${color}"
              transform="rotate(${rotation} ${x} ${y})">${letter}</text>
      `;
    });
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="noise" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#f8f9fa"/>
            <circle cx="2" cy="2" r="0.5" fill="#dee2e6" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#noise)" stroke="#dee2e6" stroke-width="2"/>
        ${noiseLines}
        ${noiseCircles}
        ${letterElements}
      </svg>
    `;
    
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Clean up expired CAPTCHAs (should be run periodically)
   */
  async cleanupExpiredCaptchas(): Promise<number> {
    const db = getDatabase();
    
    const result = await db('captcha_records')
      .where('expires_at', '<', new Date())
      .delete();
    
    return result;
  }
}

export const captchaService = new CaptchaService();