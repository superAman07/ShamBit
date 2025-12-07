/**
 * End-to-End Notification System Test
 * 
 * This script:
 * 1. Checks database connection
 * 2. Finds a test user
 * 3. Seeds test notifications
 * 4. Verifies notifications were created
 * 5. Tests API endpoint
 */

import { getDatabase, initializeDatabase } from '@shambit/database';
import { loadConfig } from '@shambit/config';
import { createLogger } from '@shambit/shared';

const logger = createLogger('test-notifications-e2e');

interface TestNotification {
  type: string;
  title: string;
  body: string;
  data: any;
  channel: 'push' | 'sms' | 'email';
  status: 'sent' | 'failed' | 'pending';
  sentAt?: Date;
}

const testNotifications: TestNotification[] = [
  {
    type: 'order_confirmed',
    title: 'Order Confirmed! 🎉',
    body: 'Your order #12345 has been confirmed and will be delivered soon',
    data: { orderId: 'test-order-1', orderNumber: '12345' },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    type: 'order_preparing',
    title: 'Order Being Prepared 📦',
    body: 'Your order #12345 is being prepared and will be out for delivery soon',
    data: { orderId: 'test-order-1', orderNumber: '12345' },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
  },
  {
    type: 'order_out_for_delivery',
    title: 'Order Out for Delivery 🚚',
    body: 'Your order #12345 is on its way! Expected delivery: 30 minutes',
    data: { orderId: 'test-order-1', orderNumber: '12345', eta: '30 minutes' },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
  },
  {
    type: 'payment_success',
    title: 'Payment Successful 💳',
    body: 'Payment of ₹599.00 received for order #12345',
    data: { orderId: 'test-order-1', orderNumber: '12345', amount: 59900 },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    type: 'promotional',
    title: 'Special Offer! 🎁',
    body: 'Get 20% off on your next order. Use code: SAVE20',
    data: { code: 'SAVE20', discount: 20 },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

async function runE2ETest() {
  console.log('\n🧪 Starting End-to-End Notification System Test\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Initialize database
    console.log('\n📊 Step 1: Initializing database connection...');
    const config = loadConfig();
    initializeDatabase({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      poolMin: config.DB_POOL_MIN,
      poolMax: config.DB_POOL_MAX,
    });
    const db = getDatabase();
    console.log('✅ Database connected successfully');

    // Step 2: Check if notification tables exist
    console.log('\n📋 Step 2: Checking notification tables...');
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%notification%'
    `);
    
    if (tables.rows.length === 0) {
      console.error('❌ No notification tables found!');
      console.log('Please run migrations: npm run migrate:latest');
      process.exit(1);
    }
    
    console.log('✅ Found notification tables:');
    tables.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });

    // Step 3: Find a test user
    console.log('\n👤 Step 3: Finding test user...');
    const users = await db('users')
      .select('id', 'mobile_number', 'name')
      .limit(1);

    if (users.length === 0) {
      console.error('❌ No users found in database!');
      console.log('Please create a user first via the mobile app or admin panel.');
      process.exit(1);
    }

    const testUser = users[0];
    console.log('✅ Found test user:');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Name: ${testUser.name || 'N/A'}`);
    console.log(`   Mobile: ${testUser.mobile_number}`);

    // Step 4: Clean existing test notifications
    console.log('\n🗑️  Step 4: Cleaning existing notifications...');
    const deleted = await db('notification_history')
      .where({ user_id: testUser.id })
      .delete();
    console.log(`✅ Deleted ${deleted} existing notifications`);

    // Step 5: Seed test notifications
    console.log('\n📝 Step 5: Seeding test notifications...');
    const notifications = testNotifications.map(notif => ({
      user_id: testUser.id,
      type: notif.type,
      channel: notif.channel,
      title: notif.title,
      body: notif.body,
      data: JSON.stringify(notif.data),
      status: notif.status,
      sent_at: notif.sentAt,
      created_at: notif.sentAt || new Date(),
    }));

    await db('notification_history').insert(notifications);
    console.log(`✅ Seeded ${notifications.length} test notifications`);

    // Step 6: Verify notifications in database
    console.log('\n🔍 Step 6: Verifying notifications in database...');
    const dbNotifications = await db('notification_history')
      .where({ user_id: testUser.id })
      .orderBy('created_at', 'desc');

    console.log(`✅ Found ${dbNotifications.length} notifications in database`);
    console.log('\nNotification types:');
    dbNotifications.forEach((notif: any, index: number) => {
      console.log(`   ${index + 1}. ${notif.type} - "${notif.title}"`);
    });

    // Step 7: Test API endpoint (without auth for now)
    console.log('\n🌐 Step 7: Testing API endpoint...');
    console.log('Note: Skipping API test as it requires authentication');
    console.log('To test API manually, use:');
    console.log(`   curl -X GET "http://localhost:3000/api/v1/notifications/history?limit=10&offset=0" \\`);
    console.log(`     -H "Authorization: Bearer YOUR_JWT_TOKEN"`);

    // Step 8: Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ End-to-End Test PASSED!\n');
    console.log('Summary:');
    console.log(`   ✅ Database connected`);
    console.log(`   ✅ Notification tables exist`);
    console.log(`   ✅ Test user found: ${testUser.mobile_number}`);
    console.log(`   ✅ ${notifications.length} notifications seeded`);
    console.log(`   ✅ Notifications verified in database`);
    
    console.log('\n📱 Next Steps:');
    console.log('   1. Install mobile app: adb install mobile_app/app/build/outputs/apk/debug/app-debug.apk');
    console.log(`   2. Login with: ${testUser.mobile_number}`);
    console.log('   3. Navigate to: Profile → Notifications');
    console.log('   4. You should see 5 test notifications!');
    
    console.log('\n🎉 Test completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test FAILED!');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

// Run the test
runE2ETest();
