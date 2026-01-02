import { TestEnvironmentHelper } from './utils/test-helpers';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');
  
  // Clean up test environment variables
  TestEnvironmentHelper.cleanupTestEnvironment();
  
  // Close any open database connections
  // This would be handled by Prisma client cleanup
  
  // Close Redis connections
  // This would be handled by Redis client cleanup
  
  // Clean up any temporary files or resources
  
  console.log('✅ Global test cleanup complete');
}