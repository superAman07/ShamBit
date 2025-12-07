/**
 * Frontend Optimization Test Utilities
 * Use these in browser console to verify optimizations
 */

import { requestDeduplicator } from './requestDeduplication';
import { errorTracker } from './errorTracking';
import { apiService } from '@/services/api';

export const optimizationTests = {
  /**
   * Test request deduplication
   */
  async testDeduplication() {
    console.log('🧪 Testing Request Deduplication...\n');

    const startTime = Date.now();
    const endpoint = '/api/v1/categories';

    console.log('Making 5 simultaneous requests to:', endpoint);
    
    // Make 5 identical requests simultaneously
    const promises = Array(5).fill(null).map(() => 
      apiService.get(endpoint)
    );

    try {
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      console.log('\n✅ Test Results:');
      console.log(`   Requests made: 5`);
      console.log(`   Responses received: ${results.length}`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Pending requests: ${requestDeduplicator.getPendingCount()}`);
      console.log('\n💡 Check Network tab - you should see only 1 actual HTTP request');
      console.log('💡 Check Console - you should see "Reusing in-flight request" messages');

      return {
        success: true,
        duration,
        requestCount: 5,
        responseCount: results.length,
      };
    } catch (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error };
    }
  },

  /**
   * Test error tracking
   */
  testErrorTracking() {
    console.log('🧪 Testing Error Tracking...\n');

    // Clear existing errors
    errorTracker.clear();

    // Create test errors
    const errors = [
      { message: 'Test API Error', type: 'API_ERROR', severity: 'low' },
      { message: 'Test Network Error', type: 'NETWORK_ERROR', severity: 'medium' },
      { message: 'Test Critical Error', type: 'RUNTIME_ERROR', severity: 'critical' },
    ];

    errors.forEach(({ message, severity }) => {
      errorTracker.track(
        new Error(message),
        { component: 'TestSuite', action: 'testErrorTracking' },
        severity as any
      );
    });

    const trackedErrors = errorTracker.getErrors();
    
    console.log('✅ Test Results:');
    console.log(`   Errors tracked: ${trackedErrors.length}`);
    console.log(`   Critical errors: ${errorTracker.getErrorsBySeverity('critical').length}`);
    console.log(`   Medium errors: ${errorTracker.getErrorsBySeverity('medium').length}`);
    console.log(`   Low errors: ${errorTracker.getErrorsBySeverity('low').length}`);
    console.log('\n📊 Tracked Errors:');
    console.table(trackedErrors.map(e => ({
      message: e.message,
      type: e.type,
      severity: e.severity,
      timestamp: e.context.timestamp,
    })));

    return {
      success: true,
      errorCount: trackedErrors.length,
      errors: trackedErrors,
    };
  },

  /**
   * Test performance monitoring
   */
  async testPerformance() {
    console.log('🧪 Testing Performance Monitoring...\n');

    const endpoints = [
      '/api/v1/categories',
      '/api/v1/products',
      '/api/v1/brands',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      try {
        await apiService.get(endpoint);
        const duration = Date.now() - startTime;
        results.push({ endpoint, duration, success: true });
        console.log(`✓ ${endpoint}: ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({ endpoint, duration, success: false });
        console.log(`✗ ${endpoint}: ${duration}ms (failed)`);
      }
    }

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const slowRequests = results.filter(r => r.duration > 1000);

    console.log('\n✅ Performance Summary:');
    console.log(`   Total requests: ${results.length}`);
    console.log(`   Average duration: ${Math.round(avgDuration)}ms`);
    console.log(`   Slow requests (>1s): ${slowRequests.length}`);

    if (slowRequests.length > 0) {
      console.log('\n⚠️  Slow Requests:');
      slowRequests.forEach(r => {
        console.log(`   ${r.endpoint}: ${r.duration}ms`);
      });
    }

    return {
      success: true,
      results,
      avgDuration,
      slowRequests,
    };
  },

  /**
   * Run all tests
   */
  async runAll() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Frontend Optimization Tests         ║');
    console.log('╚════════════════════════════════════════╝\n');

    const results = {
      deduplication: null as any,
      errorTracking: null as any,
      performance: null as any,
    };

    try {
      results.deduplication = await this.testDeduplication();
      console.log('\n' + '─'.repeat(50) + '\n');
      
      results.errorTracking = this.testErrorTracking();
      console.log('\n' + '─'.repeat(50) + '\n');
      
      results.performance = await this.testPerformance();
      
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║      All Tests Completed! ✅          ║');
      console.log('╚════════════════════════════════════════╝\n');

      return results;
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      return results;
    }
  },

  /**
   * View current stats
   */
  viewStats() {
    console.log('📊 Current Optimization Stats\n');
    
    console.log('Request Deduplication:');
    console.log(`   Pending requests: ${requestDeduplicator.getPendingCount()}`);
    
    console.log('\nError Tracking:');
    const errors = errorTracker.getErrors();
    console.log(`   Total errors: ${errors.length}`);
    console.log(`   Critical: ${errorTracker.getErrorsBySeverity('critical').length}`);
    console.log(`   High: ${errorTracker.getErrorsBySeverity('high').length}`);
    console.log(`   Medium: ${errorTracker.getErrorsBySeverity('medium').length}`);
    console.log(`   Low: ${errorTracker.getErrorsBySeverity('low').length}`);

    if (errors.length > 0) {
      console.log('\nRecent Errors:');
      console.table(errors.slice(-5).map(e => ({
        message: e.message,
        type: e.type,
        severity: e.severity,
        component: e.context.component,
      })));
    }

    return {
      pendingRequests: requestDeduplicator.getPendingCount(),
      totalErrors: errors.length,
      errorsBySeverity: {
        critical: errorTracker.getErrorsBySeverity('critical').length,
        high: errorTracker.getErrorsBySeverity('high').length,
        medium: errorTracker.getErrorsBySeverity('medium').length,
        low: errorTracker.getErrorsBySeverity('low').length,
      },
    };
  },
};

// Make available globally for console access
if (typeof window !== 'undefined') {
  (window as any).optimizationTests = optimizationTests;
  console.log('💡 Optimization tests available! Use: optimizationTests.runAll()');
}

export default optimizationTests;
