// Property-Based Testing Configuration
// Based on design document requirements

export const PBT_CONFIGURATION = {
  // Minimum 100 iterations per property test as per design document
  numRuns: 100,
  
  // Timeout for each property test
  timeout: 10000,
  
  // Verbose output for debugging
  verbose: true,
  
  // Seed for reproducible tests (can be overridden)
  seed: undefined,
  
  // Maximum shrinking iterations
  maxShrinkRounds: 1000,
  
  // Enable async property testing
  asyncProperty: true,
  
  // Test categories with specific configurations
  categories: {
    validation: {
      numRuns: 100,
      timeout: 5000,
      description: 'Data validation property tests'
    },
    security: {
      numRuns: 150, // More runs for security-critical properties
      timeout: 8000,
      description: 'Security-related property tests'
    },
    rateLimiting: {
      numRuns: 50, // Fewer runs for rate limiting to avoid overwhelming
      timeout: 15000,
      description: 'Rate limiting and abuse prevention tests'
    },
    integration: {
      numRuns: 75,
      timeout: 20000,
      description: 'End-to-end integration property tests'
    }
  }
};

// Property test tags for traceability to design document
export const PROPERTY_TAGS = {
  PROPERTY_1: 'Feature: simplified-seller-registration, Property 1: Registration Data Validation',
  PROPERTY_2: 'Feature: simplified-seller-registration, Property 2: Valid Registration Account Creation',
  PROPERTY_3: 'Feature: simplified-seller-registration, Property 3: OTP Generation and Verification',
  PROPERTY_4: 'Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management',
  PROPERTY_5: 'Feature: simplified-seller-registration, Property 5: OTP Rate Limiting',
  PROPERTY_6: 'Feature: simplified-seller-registration, Property 6: Registration Rate Limiting',
  PROPERTY_7: 'Feature: simplified-seller-registration, Property 7: Login Rate Limiting',
  PROPERTY_8: 'Feature: simplified-seller-registration, Property 8: Duplicate Account Prevention',
  PROPERTY_9: 'Feature: simplified-seller-registration, Property 9: Password Security',
  PROPERTY_10: 'Feature: simplified-seller-registration, Property 10: Transport Security',
  PROPERTY_11: 'Feature: simplified-seller-registration, Property 11: PAN Number Validation',
  PROPERTY_12: 'Feature: simplified-seller-registration, Property 12: GST Number Validation',
  PROPERTY_13: 'Feature: simplified-seller-registration, Property 13: Abuse Detection and Prevention'
};

// Generators for common data types
export const GENERATORS = {
  // Valid Indian mobile number generator
  validMobile: () => {
    const firstDigit = Math.floor(Math.random() * 4) + 6; // 6-9
    const remainingDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    return firstDigit + remainingDigits;
  },
  
  // Invalid mobile number generator
  invalidMobile: () => {
    const patterns = [
      () => Math.floor(Math.random() * 1000000000).toString(), // Too short
      () => Math.floor(Math.random() * 100000000000).toString(), // Too long
      () => '5' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'), // Invalid start
      () => 'abcdefghij', // Non-numeric
      () => '' // Empty
    ];
    return patterns[Math.floor(Math.random() * patterns.length)]();
  },
  
  // Valid email generator
  validEmail: () => {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const username = Math.random().toString(36).substring(2, 10);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  },
  
  // Strong password generator
  strongPassword: () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '@$!%*?&';
    
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    const allChars = lowercase + uppercase + numbers + special;
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },
  
  // Valid PAN number generator
  validPAN: () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let pan = '';
    
    // First 5 letters
    for (let i = 0; i < 5; i++) {
      pan += letters[Math.floor(Math.random() * letters.length)];
    }
    
    // 4 digits
    for (let i = 0; i < 4; i++) {
      pan += Math.floor(Math.random() * 10);
    }
    
    // Last letter
    pan += letters[Math.floor(Math.random() * letters.length)];
    
    return pan;
  },
  
  // Valid GST number generator
  validGST: (pan?: string) => {
    const stateCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    const stateCode = stateCodes[Math.floor(Math.random() * stateCodes.length)];
    const panToUse = pan || GENERATORS.validPAN();
    const entityCode = Math.floor(Math.random() * 10);
    const checkDigit = Math.floor(Math.random() * 10);
    
    return `${stateCode}${panToUse}${entityCode}Z${checkDigit}`;
  }
};

export default PBT_CONFIGURATION;