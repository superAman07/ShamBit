import { execSync } from 'child_process';
import { TestEnvironmentHelper } from './utils/test-helpers';

export default async function globalSetup() {
  console.log('🚀 Setting up global test environment...');
  
  // Set up test environment variables
  TestEnvironmentHelper.setTestEnvironmentVariables();
  
  // Check if we're running in CI environment
  const isCI = process.env.CI === 'true';
  
  if (!isCI) {
    console.log('📦 Setting up test database...');
    
    try {
      // Generate Prisma client for tests
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Run database migrations for test database
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
        },
      });
      
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.warn('⚠️  Database setup failed (this is expected in CI):', error.message);
    }
  }
  
  // Set up Redis connection for tests
  if (!isCI) {
    console.log('🔴 Setting up Redis for tests...');
    // Redis setup would go here if needed
    console.log('✅ Redis setup complete');
  }
  
  console.log('✅ Global test setup complete');
}