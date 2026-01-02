import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultTemplates = [
  // Order Confirmation Templates
  {
    name: 'Order Confirmation Email',
    type: 'ORDER_CONFIRMATION',
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    locale: 'en',
    subject: 'Order Confirmation - {{orderNumber}}',
    title: 'Order Confirmed!',
    content: `Hi {{customerName}},

Thank you for your order! Your order {{orderNumber}} has been confirmed and is being processed.

Order Details:
{{#each items}}
- {{name}} x {{quantity}} = {{price}}
{{/each}}

Subtotal: {{subtotal}}
Shipping: {{shippingAmount}}
Tax: {{taxAmount}}
Total: {{totalAmount}}

We'll send you updates as your order progresses.

Best regards,
The Marketplace Team`,
    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333;">Order Confirmed!</h1>
  <p>Hi {{customerName}},</p>
  
  <p>Thank you for your order! Your order <strong>{{orderNumber}}</strong> has been confirmed and is being processed.</p>
  
  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
    <h3>Order Details:</h3>
    {{#each items}}
    <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
      <strong>{{name}}</strong> x {{quantity}} = {{price}}
    </div>
    {{/each}}
    
    <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #333;">
      <div>Subtotal: {{subtotal}}</div>
      <div>Shipping: {{shippingAmount}}</div>
      <div>Tax: {{taxAmount}}</div>
      <div style="font-size: 18px; font-weight: bold;">Total: {{totalAmount}}</div>
    </div>
  </div>
  
  <p>We'll send you updates as your order progresses.</p>
  
  <p>Best regards,<br>The Marketplace Team</p>
</div>`,
    variables: ['customerName', 'orderNumber', 'items', 'subtotal', 'shippingAmount', 'taxAmount', 'totalAmount'],
    isGlobal: true,
    status: 'ACTIVE',
  },
  
  {
    name: 'Order Confirmation SMS',
    type: 'ORDER_CONFIRMATION',
    channel: 'SMS',
    category: 'TRANSACTIONAL',
    locale: 'en',
    content: 'Hi {{customerName}}! Your order {{orderNumber}} for {{totalAmount}} has been confirmed. Track your order at {{trackingUrl}}',
    variables: ['customerName', 'orderNumber', 'totalAmount', 'trackingUrl'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  {
    name: 'Order Confirmation Push',
    type: 'ORDER_CONFIRMATION',
    channel: 'PUSH',
    category: 'TRANSACTIONAL',
    locale: 'en',
    title: 'Order Confirmed!',
    content: 'Your order {{orderNumber}} for {{totalAmount}} has been confirmed.',
    variables: ['orderNumber', 'totalAmount'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  // Payment Success Templates
  {
    name: 'Payment Success Email',
    type: 'PAYMENT_SUCCESS',
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    locale: 'en',
    subject: 'Payment Received - {{orderNumber}}',
    title: 'Payment Successful',
    content: `Hi {{customerName}},

We've successfully received your payment for order {{orderNumber}}.

Payment Details:
- Amount: {{amount}}
- Payment Method: {{paymentMethod}}
- Transaction ID: {{transactionId}}

Your order is now being processed and will be shipped soon.

Best regards,
The Marketplace Team`,
    variables: ['customerName', 'orderNumber', 'amount', 'paymentMethod', 'transactionId'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  // Order Shipped Templates
  {
    name: 'Order Shipped Email',
    type: 'ORDER_SHIPPED',
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    locale: 'en',
    subject: 'Your Order is on the Way - {{orderNumber}}',
    title: 'Order Shipped!',
    content: `Hi {{customerName}},

Great news! Your order {{orderNumber}} has been shipped and is on its way to you.

Shipping Details:
- Tracking Number: {{trackingNumber}}
- Carrier: {{carrier}}
- Estimated Delivery: {{estimatedDelivery}}

You can track your package at: {{trackingUrl}}

Best regards,
The Marketplace Team`,
    variables: ['customerName', 'orderNumber', 'trackingNumber', 'carrier', 'estimatedDelivery', 'trackingUrl'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  // Low Stock Alert Templates
  {
    name: 'Low Stock Alert Email',
    type: 'LOW_STOCK_ALERT',
    channel: 'EMAIL',
    category: 'SYSTEM',
    locale: 'en',
    subject: 'Low Stock Alert - {{productName}}',
    title: 'Low Stock Alert',
    content: `Hi {{sellerName}},

Your product "{{productName}}" (SKU: {{sku}}) is running low on stock.

Current Stock: {{currentStock}}
Threshold: {{threshold}}

Please restock this item to avoid going out of stock.

Best regards,
The Marketplace Team`,
    variables: ['sellerName', 'productName', 'sku', 'currentStock', 'threshold'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  // Settlement Processed Templates
  {
    name: 'Settlement Processed Email',
    type: 'SETTLEMENT_PROCESSED',
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    locale: 'en',
    subject: 'Settlement Processed - {{settlementId}}',
    title: 'Settlement Processed',
    content: `Hi {{sellerName}},

Your settlement for the period {{period}} has been processed.

Settlement Details:
- Settlement ID: {{settlementId}}
- Net Amount: {{amount}}
- Account: {{accountNumber}}
- Processing Date: {{processedDate}}

The funds should appear in your account within 1-3 business days.

Best regards,
The Marketplace Team`,
    variables: ['sellerName', 'settlementId', 'period', 'amount', 'accountNumber', 'processedDate'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  // Welcome Templates
  {
    name: 'Welcome Email',
    type: 'EMAIL_VERIFICATION',
    channel: 'EMAIL',
    category: 'SYSTEM',
    locale: 'en',
    subject: 'Welcome to {{platformName}} - Please Verify Your Email',
    title: 'Welcome!',
    content: `Hi {{userName}},

Welcome to {{platformName}}! We're excited to have you join our marketplace.

Please verify your email address by clicking the link below:
{{verificationUrl}}

Once verified, you can start exploring thousands of products from our sellers.

Best regards,
The {{platformName}} Team`,
    variables: ['userName', 'platformName', 'verificationUrl'],
    isGlobal: true,
    status: 'ACTIVE',
  },

  // Password Reset Templates
  {
    name: 'Password Reset Email',
    type: 'PASSWORD_RESET',
    channel: 'EMAIL',
    category: 'SECURITY',
    locale: 'en',
    subject: 'Reset Your Password - {{platformName}}',
    title: 'Password Reset Request',
    content: `Hi {{userName}},

We received a request to reset your password for your {{platformName}} account.

Click the link below to reset your password:
{{resetUrl}}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
The {{platformName}} Team`,
    variables: ['userName', 'platformName', 'resetUrl'],
    isGlobal: true,
    status: 'ACTIVE',
  },
];

async function seedNotificationTemplates() {
  console.log('🌱 Seeding notification templates...');

  try {
    // Create a system user for template creation
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@marketplace.com' },
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'system@marketplace.com',
          name: 'System User',
          password: 'system', // This should be hashed in production
          roles: ['ADMIN'],
          status: 'ACTIVE',
          isEmailVerified: true,
        },
      });
    }

    // Seed templates
    for (const template of defaultTemplates) {
      const existing = await prisma.notificationTemplate.findFirst({
        where: {
          type: template.type as any,
          channel: template.channel as any,
          locale: template.locale,
          tenantId: null,
        },
      });

      if (!existing) {
        await prisma.notificationTemplate.create({
          data: {
            ...template,
            type: template.type as any,
            channel: template.channel as any,
            category: template.category as any,
            status: template.status as any,
            createdBy: systemUser.id,
          },
        });
        console.log(`✅ Created template: ${template.name}`);
      } else {
        console.log(`⏭️  Template already exists: ${template.name}`);
      }
    }

    console.log('🎉 Notification templates seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding notification templates:', error);
    throw error;
  }
}

async function main() {
  await seedNotificationTemplates();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });