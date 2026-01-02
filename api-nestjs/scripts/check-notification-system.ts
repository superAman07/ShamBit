import { PrismaClient } from '@prisma/client';
import { NotificationType, NotificationChannel, TemplateStatus } from '../src/domains/notification/types/notification.types';

const prisma = new PrismaClient();

async function checkNotificationSystem() {
  console.log('🔍 Checking Notification System Status...\n');

  try {
    // Check database connection
    console.log('1. Database Connection...');
    await prisma.$connect();
    console.log('   ✅ Database connected successfully\n');

    // Check notification tables exist
    console.log('2. Database Schema...');
    
    const notificationCount = await prisma.notification.count();
    console.log(`   ✅ Notifications table: ${notificationCount} records`);
    
    const templateCount = await prisma.notificationTemplate.count();
    console.log(`   ✅ Templates table: ${templateCount} records`);
    
    const preferenceCount = await prisma.notificationPreference.count();
    console.log(`   ✅ Preferences table: ${preferenceCount} records`);
    
    const webhookCount = await (prisma as any).webhookSubscription.count();
    console.log(`   ✅ Webhook subscriptions table: ${webhookCount} records\n`);

    // Check templates are seeded
    console.log('3. Default Templates...');
    const orderConfirmationTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        type: NotificationType.ORDER_CONFIRMATION,
        channel: NotificationChannel.EMAIL,
      },
    });
    
    if (orderConfirmationTemplate) {
      console.log('   ✅ Order confirmation email template exists');
    } else {
      console.log('   ❌ Order confirmation email template missing');
    }

    const paymentSuccessTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        type: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.EMAIL,
      },
    });
    
    if (paymentSuccessTemplate) {
      console.log('   ✅ Payment success email template exists');
    } else {
      console.log('   ❌ Payment success email template missing');
    }

    console.log('\n4. Environment Configuration...');
    
    // Check environment variables
    const requiredEnvVars = [
      'REDIS_HOST',
      'REDIS_PORT',
      'EMAIL_PROVIDER',
      'EMAIL_FROM_EMAIL',
    ];

    let envVarsOk = true;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: ${process.env[envVar]}`);
      } else {
        console.log(`   ❌ ${envVar}: Not set`);
        envVarsOk = false;
      }
    }

    // Check optional environment variables
    console.log('\n5. Optional Services...');
    
    if (process.env.TWILIO_ACCOUNT_SID) {
      console.log('   ✅ Twilio SMS configured');
    } else {
      console.log('   ⚠️  Twilio SMS not configured (optional)');
    }

    if (process.env.FCM_PROJECT_ID) {
      console.log('   ✅ Firebase FCM configured');
    } else {
      console.log('   ⚠️  Firebase FCM not configured (optional)');
    }

    if (process.env.AWS_SES_REGION || process.env.SENDGRID_API_KEY) {
      console.log('   ✅ Production email service configured');
    } else {
      console.log('   ⚠️  Production email service not configured (using SMTP)');
    }

    console.log('\n6. System Status Summary...');
    
    if (envVarsOk && templateCount > 0) {
      console.log('   🎉 Notification system is ready!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Start Redis: docker compose -f docker-compose.redis.yml up -d');
      console.log('   2. Start the application: npm run start:dev');
      console.log('   3. Test the API endpoints');
      console.log('\n📚 Documentation:');
      console.log('   - Setup Guide: NOTIFICATION_SETUP.md');
      console.log('   - API Documentation: /api/docs (when server is running)');
      console.log('   - System Design: docs/NOTIFICATION_SYSTEM_DESIGN.md');
    } else {
      console.log('   ❌ Notification system needs configuration');
      console.log('\n🔧 Required Actions:');
      if (!envVarsOk) {
        console.log('   - Configure missing environment variables in .env');
      }
      if (templateCount === 0) {
        console.log('   - Run: npm run notification:seed');
      }
    }

  } catch (error) {
    console.error('❌ Error checking notification system:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Ensure PostgreSQL is running');
      console.log('   - Check DATABASE_URL in .env file');
      console.log('   - Run: npx prisma migrate deploy');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkNotificationSystem()
  .catch(console.error)
  .finally(() => process.exit(0));