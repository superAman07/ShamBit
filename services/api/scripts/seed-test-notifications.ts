/**
 * Seed test notifications for development/testing
 * 
 * Usage:
 *   npx ts-node services/api/scripts/seed-test-notifications.ts <user-mobile-number>
 * 
 * Example:
 *   npx ts-node services/api/scripts/seed-test-notifications.ts +919876543210
 */

import { getDatabase } from '@shambit/database';
import { createLogger } from '@shambit/shared';

const logger = createLogger('seed-test-notifications');
const db = getDatabase();

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
  {
    type: 'order_delivered',
    title: 'Order Delivered ✅',
    body: 'Your order #12340 has been delivered. Enjoy your purchase!',
    data: { orderId: 'test-order-2', orderNumber: '12340' },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    type: 'order_confirmed',
    title: 'Order Confirmed! 🎉',
    body: 'Your order #12341 has been confirmed',
    data: { orderId: 'test-order-3', orderNumber: '12341' },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    type: 'promotional',
    title: 'New Products Added! 🆕',
    body: 'Check out our latest collection of fresh products',
    data: {},
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  },
  {
    type: 'order_delivered',
    title: 'Order Delivered ✅',
    body: 'Your order #12338 has been delivered successfully',
    data: { orderId: 'test-order-4', orderNumber: '12338' },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  },
  {
    type: 'promotional',
    title: 'Weekend Sale! 🛍️',
    body: 'Flat 30% off on all products this weekend',
    data: { discount: 30 },
    channel: 'push',
    status: 'sent',
    sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  },
];

async function seedTestNotifications(mobileNumber: string) {
  try {
    logger.info('Starting test notification seeding', { mobileNumber });

    // Find user by mobile number
    const user = await db('users')
      .where({ mobile_number: mobileNumber })
      .first();

    if (!user) {
      logger.error('User not found', { mobileNumber });
      console.error(`❌ User with mobile number ${mobileNumber} not found`);
      console.log('\nPlease provide a valid mobile number of an existing user.');
      process.exit(1);
    }

    logger.info('User found', { userId: user.id, mobileNumber });
    console.log(`\n✅ Found user: ${user.name || 'Unknown'} (${mobileNumber})`);

    // Delete existing test notifications for this user
    const deleted = await db('notification_history')
      .where({ user_id: user.id })
      .delete();

    if (deleted > 0) {
      logger.info('Deleted existing notifications', { count: deleted });
      console.log(`🗑️  Deleted ${deleted} existing notifications`);
    }

    // Insert test notifications
    const notifications = testNotifications.map(notif => ({
      user_id: user.id,
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

    logger.info('Test notifications seeded successfully', { count: notifications.length });
    console.log(`\n✅ Successfully seeded ${notifications.length} test notifications!`);
    console.log('\nNotification types:');
    testNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. ${notif.type} - "${notif.title}"`);
    });

    console.log('\n📱 Open the mobile app and navigate to Profile → Notifications to see them!');
    console.log('\n✨ Done!');

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding test notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Get mobile number from command line arguments
const mobileNumber = process.argv[2];

if (!mobileNumber) {
  console.error('❌ Please provide a mobile number');
  console.log('\nUsage:');
  console.log('  npx ts-node services/api/scripts/seed-test-notifications.ts <mobile-number>');
  console.log('\nExample:');
  console.log('  npx ts-node services/api/scripts/seed-test-notifications.ts +919876543210');
  process.exit(1);
}

// Run the seeding
seedTestNotifications(mobileNumber);
