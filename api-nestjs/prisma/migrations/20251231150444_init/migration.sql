-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CONFIRMATION', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'ORDER_RETURNED', 'ORDER_REFUNDED', 'ORDER_DELAYED', 'ORDER_READY_FOR_PICKUP', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_PENDING', 'PAYMENT_REFUNDED', 'PAYMENT_DISPUTED', 'PAYMENT_CHARGEBACK', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'PRODUCT_OUT_OF_STOCK', 'PRODUCT_BACK_IN_STOCK', 'LOW_STOCK_ALERT', 'PRICE_DROP_ALERT', 'WISHLIST_ITEM_AVAILABLE', 'SELLER_APPLICATION_APPROVED', 'SELLER_APPLICATION_REJECTED', 'SELLER_PAYOUT_PROCESSED', 'SELLER_PAYOUT_FAILED', 'SELLER_ACCOUNT_SUSPENDED', 'SELLER_PERFORMANCE_ALERT', 'PROMOTION_ACTIVATED', 'PROMOTION_EXPIRED', 'PROMOTION_APPLIED', 'FLASH_SALE_STARTED', 'COUPON_EXPIRING_SOON', 'SYSTEM_MAINTENANCE', 'SECURITY_ALERT', 'ACCOUNT_LOCKED', 'PASSWORD_RESET', 'EMAIL_VERIFICATION', 'TWO_FACTOR_ENABLED', 'LOGIN_FROM_NEW_DEVICE', 'SETTLEMENT_PROCESSED', 'SETTLEMENT_FAILED', 'SETTLEMENT_SCHEDULED', 'SETTLEMENT_DELAYED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'BOUNCED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TRANSACTIONAL', 'MARKETING', 'SYSTEM', 'SECURITY', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'TESTING');

-- CreateEnum
CREATE TYPE "PreferenceFrequency" AS ENUM ('IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED', 'FAILED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'ABANDONED', 'MERGED');

-- CreateEnum
CREATE TYPE "ReservationType" AS ENUM ('CART', 'ORDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ReservationPriority" AS ENUM ('CART', 'ORDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'BUNDLE_DISCOUNT');

-- CreateEnum
CREATE TYPE "CartAction" AS ENUM ('CREATED', 'ITEM_ADDED', 'ITEM_REMOVED', 'ITEM_QUANTITY_UPDATED', 'PROMOTION_APPLIED', 'PROMOTION_REMOVED', 'PRICE_UPDATED', 'MERGED', 'CONVERTED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'ADMIN', 'GUEST');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_features" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "tenant_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY['BUYER']::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOME',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "gstNumber" TEXT,
    "panNumber" TEXT NOT NULL,
    "businessAddress" JSONB NOT NULL,
    "bankDetails" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "verificationLevel" TEXT NOT NULL DEFAULT 'NONE',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL,
    "pathIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL,
    "inputType" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "isSearchable" BOOLEAN NOT NULL DEFAULT false,
    "isComparable" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "groupName" TEXT,
    "helpText" TEXT,
    "placeholder" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "isLocalizable" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_options" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_localizations" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "helpText" TEXT,
    "placeholder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_localizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isInheritable" BOOLEAN NOT NULL DEFAULT false,
    "isOverridable" BOOLEAN NOT NULL DEFAULT false,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "isSearchable" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "allowedValues" TEXT[],
    "validationRules" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "displayName" TEXT,
    "helpText" TEXT,
    "placeholder" TEXT,
    "inheritedFrom" TEXT,
    "overriddenAt" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attribute_inheritance" (
    "id" TEXT NOT NULL,
    "sourceAttributeId" TEXT NOT NULL,
    "targetCategoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overriddenValues" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_attribute_inheritance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sellerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_brands" (
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_brands_pkey" PRIMARY KEY ("categoryId","brandId")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT,
    "sellerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "stringValue" TEXT,
    "numberValue" DOUBLE PRECISION,
    "booleanValue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_values" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_images" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_pricing" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2),
    "discount" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_inventory" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "isTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "rate" DECIMAL(5,4),
    "fixedAmount" DECIMAL(15,2),
    "tiers" JSONB,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingAddressId" TEXT NOT NULL,
    "billingAddressId" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "productSnapshot" JSONB NOT NULL,
    "variantSnapshot" JSONB NOT NULL,
    "pricingSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "gatewayResponse" JSONB,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_accounts" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'SAVINGS',
    "upiId" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "kycDocuments" JSONB,
    "verificationDetails" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "razorpayAccountId" TEXT,
    "razorpayContactId" TEXT,
    "razorpayFundAccountId" TEXT,
    "businessName" TEXT,
    "businessType" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_wallets" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "availableBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reservedBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "lastSettlementAt" TIMESTAMP(3),
    "lastSettlementAmount" DECIMAL(15,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "sellerAccountId" TEXT,
    "transactionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "balanceBefore" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "orderId" TEXT,
    "paymentId" TEXT,
    "settlementId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(15,2) NOT NULL,
    "commissionAmount" DECIMAL(15,2) NOT NULL,
    "platformFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "settlementDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "razorpayPayoutId" TEXT,
    "razorpayTransferId" TEXT,
    "gatewayResponse" JSONB,
    "failureReason" TEXT,
    "failureCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_transactions" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "paymentId" TEXT,
    "grossAmount" DECIMAL(15,2) NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "commissionAmount" DECIMAL(15,2) NOT NULL,
    "platformFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_schedules" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "minimumAmount" DECIMAL(15,2) NOT NULL DEFAULT 100,
    "holdPeriodDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextSettlementDate" TIMESTAMP(3),
    "lastSettlementDate" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sellerId" TEXT,
    "batchSize" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successfulItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "results" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_audit_logs" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changes" JSONB,
    "userId" TEXT,
    "userRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_tracking" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "appliedPromotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availablePromotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "expiresAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedToOrderId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "currentUnitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availabilityReason" TEXT,
    "reservationId" TEXT,
    "reservationExpiresAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variantSnapshot" JSONB NOT NULL DEFAULT '{}',
    "pricingSnapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,

    CONSTRAINT "review_helpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregated_ratings" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "rating1Count" INTEGER NOT NULL DEFAULT 0,
    "rating2Count" INTEGER NOT NULL DEFAULT 0,
    "rating3Count" INTEGER NOT NULL DEFAULT 0,
    "rating4Count" INTEGER NOT NULL DEFAULT 0,
    "rating5Count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aggregated_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'TRANSACTIONAL',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipients" JSONB NOT NULL,
    "channels" "NotificationChannel"[],
    "templateId" TEXT,
    "templateVariables" JSONB NOT NULL DEFAULT '{}',
    "renderedContent" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "causationId" TEXT,
    "idempotencyKey" TEXT,
    "batchId" TEXT,
    "tenantId" TEXT,
    "userId" TEXT,
    "source" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "messageId" TEXT,
    "subject" TEXT,
    "content" TEXT,
    "htmlContent" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "providerId" TEXT,
    "providerMessageId" TEXT,
    "providerResponse" JSONB,
    "cost" DECIMAL(10,4),
    "currency" TEXT DEFAULT 'USD',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultVariables" JSONB NOT NULL DEFAULT '{}',
    "layoutId" TEXT,
    "styles" JSONB,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "testGroup" TEXT,
    "testPercentage" INTEGER,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_template_localizations" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "subject" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_template_localizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_layouts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "headerContent" TEXT,
    "footerContent" TEXT,
    "styles" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "category" "NotificationCategory",
    "channels" "NotificationChannel"[] DEFAULT ARRAY[]::"NotificationChannel"[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "PreferenceFrequency" NOT NULL DEFAULT 'IMMEDIATE',
    "batchingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxBatchSize" INTEGER NOT NULL DEFAULT 10,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "priority" "NotificationPriority",
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "deviceToken" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "consentMethod" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeReason" TEXT,
    "unsubscribeMethod" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" "NotificationType"[],
    "secret" TEXT,
    "headers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryBackoff" TEXT NOT NULL DEFAULT 'EXPONENTIAL',
    "retryMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "maxRetryDelay" INTEGER NOT NULL DEFAULT 300,
    "filters" JSONB,
    "tenantId" TEXT,
    "userId" TEXT,
    "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" "NotificationType" NOT NULL,
    "eventId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "httpMethod" TEXT NOT NULL DEFAULT 'POST',
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "responseStatus" INTEGER,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "responseTime" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_batches" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "processedRecipients" INTEGER NOT NULL DEFAULT 0,
    "successfulDeliveries" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "batchSize" INTEGER NOT NULL DEFAULT 1000,
    "delayBetweenBatches" INTEGER NOT NULL DEFAULT 1000,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rate_limits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "maxPerMinute" INTEGER,
    "maxPerHour" INTEGER,
    "maxPerDay" INTEGER,
    "maxPerMonth" INTEGER,
    "burstLimit" INTEGER,
    "currentMinute" INTEGER NOT NULL DEFAULT 0,
    "currentHour" INTEGER NOT NULL DEFAULT 0,
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "currentMonth" INTEGER NOT NULL DEFAULT 0,
    "lastResetMinute" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResetHour" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResetDay" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResetMonth" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hour" INTEGER,
    "tenantId" TEXT,
    "userId" TEXT,
    "type" "NotificationType",
    "channel" "NotificationChannel",
    "category" "NotificationCategory",
    "sent" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "bounced" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" INTEGER NOT NULL DEFAULT 0,
    "avgProcessingTime" DOUBLE PRECISION,
    "avgDeliveryTime" DOUBLE PRECISION,
    "totalCost" DECIMAL(10,4),
    "currency" TEXT DEFAULT 'USD',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" "NotificationChannel",
    "data" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changes" JSONB,
    "userId" TEXT,
    "tenantId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "eventType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "notificationType" "NotificationType" NOT NULL,
    "channels" "NotificationChannel"[],
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "templateOverrides" JSONB,
    "tenantId" TEXT,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" JSONB,
    "lastHealthCheck" TIMESTAMP(3),
    "healthStatus" TEXT,
    "tenantId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "position" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetRules" JSONB DEFAULT '{}',
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION,
    "targetRules" JSONB DEFAULT '{}',
    "metrics" JSONB DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "salary" TEXT,
    "requirements" TEXT[],
    "benefits" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "postedBy" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT NOT NULL,
    "coverLetter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "targetRules" JSONB DEFAULT '{}',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_index" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(10,2),
    "minOrderAmount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usageLimitPerUser" INTEGER,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "applicableCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableSellers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "getDiscountPercentage" DECIMAL(5,2),
    "bundleProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bundleMinQuantity" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usage" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applied_promotions" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "promotionCode" TEXT NOT NULL,
    "promotionName" TEXT NOT NULL,
    "cartId" TEXT,
    "cartItemId" TEXT,
    "orderId" TEXT,
    "discountType" "PromotionType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(10,2),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "eligibilitySnapshot" JSONB NOT NULL DEFAULT '{}',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedBy" TEXT,

    CONSTRAINT "applied_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" "ReservationType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "ReservationPriority" NOT NULL DEFAULT 'CART',
    "expiresAt" TIMESTAMP(3),
    "parentReservationId" TEXT,
    "convertedToReservationId" TEXT,
    "createdBy" TEXT,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_price_history" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "oldUnitPrice" DECIMAL(10,2) NOT NULL,
    "newUnitPrice" DECIMAL(10,2) NOT NULL,
    "priceChangeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_audit_logs" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "action" "CartAction" NOT NULL,
    "actorId" TEXT,
    "actorType" "ActorType" NOT NULL DEFAULT 'USER',
    "details" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "tenantId" TEXT NOT NULL DEFAULT '',
    "environment" TEXT NOT NULL DEFAULT 'development',
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saga_instances" (
    "id" TEXT NOT NULL,
    "sagaType" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "stepResults" JSONB NOT NULL DEFAULT '{}',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saga_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_read_models" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "variants" JSONB NOT NULL DEFAULT '[]',
    "pricing" JSONB NOT NULL DEFAULT '{}',
    "inventory" JSONB NOT NULL DEFAULT '{}',
    "ratings" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_read_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_read_models" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "shipping" JSONB NOT NULL DEFAULT '{}',
    "payment" JSONB NOT NULL DEFAULT '{}',
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_read_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_read_models" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL,
    "availableStock" INTEGER NOT NULL,
    "reservedStock" INTEGER NOT NULL,
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_read_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_projections" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "handlerName" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "tenantId" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRetryAt" TIMESTAMP(3),

    CONSTRAINT "failed_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_data" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "tenantId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "permissions" TEXT[],
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandSlug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'NEW',
    "reviewedBy" TEXT,
    "handledBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_access" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT NOT NULL,
    "revokedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_audit_logs" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_audit_logs" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "oldValues" JSONB,
    "newValues" JSONB,
    "oldPath" TEXT,
    "newPath" TEXT,
    "oldParentId" TEXT,
    "newParentId" TEXT,
    "userRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "gatewayProvider" TEXT NOT NULL,
    "gatewayIntentId" TEXT NOT NULL,
    "allowedPaymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confirmationMethod" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "captureMethod" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "transferGroup" TEXT,
    "applicationFee" DECIMAL(10,2),
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gatewayResponse" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "gatewayResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_userId_tenantId_key" ON "user_tenants"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "features_name_key" ON "features"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_features_tenantId_featureId_key" ON "tenant_features"("tenantId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_userId_key" ON "seller_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "attributes_slug_key" ON "attributes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_localizations_attributeId_locale_key" ON "attribute_localizations"("attributeId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_categoryId_slug_key" ON "category_attributes"("categoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_attribute_inheritance_sourceAttributeId_targetCate_key" ON "category_attribute_inheritance"("sourceAttributeId", "targetCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_values_productId_attributeId_key" ON "product_attribute_values"("productId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_variantKey_key" ON "product_variants"("productId", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "variant_attribute_values_variantId_attributeId_key" ON "variant_attribute_values"("variantId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "variant_pricing_variantId_key" ON "variant_pricing"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "variant_inventory_variantId_key" ON "variant_inventory"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentIntentId_key" ON "payments"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_accounts_sellerId_key" ON "seller_accounts"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_accounts_razorpayAccountId_key" ON "seller_accounts"("razorpayAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_wallets_sellerId_key" ON "seller_wallets"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_wallet_transactions_transactionId_key" ON "seller_wallet_transactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlementId_key" ON "settlements"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_razorpayPayoutId_key" ON "settlements"("razorpayPayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_schedules_sellerId_sellerAccountId_key" ON "settlement_schedules"("sellerId", "sellerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_jobs_jobId_key" ON "settlement_jobs"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_trackingNumber_key" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "carts_userId_status_idx" ON "carts"("userId", "status");

-- CreateIndex
CREATE INDEX "carts_sessionId_status_idx" ON "carts"("sessionId", "status");

-- CreateIndex
CREATE INDEX "carts_expiresAt_idx" ON "carts"("expiresAt");

-- CreateIndex
CREATE INDEX "carts_lastActivityAt_idx" ON "carts"("lastActivityAt");

-- CreateIndex
CREATE INDEX "carts_userId_sessionId_status_idx" ON "carts"("userId", "sessionId", "status");

-- CreateIndex
CREATE INDEX "cart_items_variantId_idx" ON "cart_items"("variantId");

-- CreateIndex
CREATE INDEX "cart_items_sellerId_idx" ON "cart_items"("sellerId");

-- CreateIndex
CREATE INDEX "cart_items_reservationId_idx" ON "cart_items"("reservationId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_variantId_sellerId_idx" ON "cart_items"("cartId", "variantId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_variantId_sellerId_key" ON "cart_items"("cartId", "variantId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_type_entityId_key" ON "reviews"("userId", "type", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_reviewId_userId_key" ON "review_helpful"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "aggregated_ratings_entityType_entityId_key" ON "aggregated_ratings"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotencyKey_key" ON "notifications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notifications_type_status_idx" ON "notifications"("type", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_tenantId_status_idx" ON "notifications"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notifications_scheduledAt_idx" ON "notifications"("scheduledAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_correlationId_idx" ON "notifications"("correlationId");

-- CreateIndex
CREATE INDEX "notifications_batchId_idx" ON "notifications"("batchId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_channel_status_idx" ON "notification_deliveries"("channel", "status");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_nextRetryAt_idx" ON "notification_deliveries"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_sentAt_idx" ON "notification_deliveries"("sentAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_deliveredAt_idx" ON "notification_deliveries"("deliveredAt");

-- CreateIndex
CREATE INDEX "notification_templates_type_channel_idx" ON "notification_templates"("type", "channel");

-- CreateIndex
CREATE INDEX "notification_templates_tenantId_status_idx" ON "notification_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_templates_status_isDefault_idx" ON "notification_templates"("status", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_type_channel_locale_tenantId_key" ON "notification_templates"("type", "channel", "locale", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_localizations_templateId_locale_key" ON "notification_template_localizations"("templateId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "notification_layouts_name_channel_tenantId_key" ON "notification_layouts"("name", "channel", "tenantId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_tenantId_idx" ON "notification_preferences"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "notification_preferences_type_category_idx" ON "notification_preferences"("type", "category");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_type_tenantId_key" ON "notification_preferences"("userId", "type", "tenantId");

-- CreateIndex
CREATE INDEX "notification_subscriptions_email_type_idx" ON "notification_subscriptions"("email", "type");

-- CreateIndex
CREATE INDEX "notification_subscriptions_phone_type_idx" ON "notification_subscriptions"("phone", "type");

-- CreateIndex
CREATE INDEX "notification_subscriptions_deviceToken_type_idx" ON "notification_subscriptions"("deviceToken", "type");

-- CreateIndex
CREATE INDEX "notification_subscriptions_userId_type_idx" ON "notification_subscriptions"("userId", "type");

-- CreateIndex
CREATE INDEX "notification_subscriptions_status_idx" ON "notification_subscriptions"("status");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_tenantId_status_idx" ON "webhook_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_userId_status_idx" ON "webhook_subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_status_idx" ON "webhook_subscriptions"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_subscriptionId_status_idx" ON "webhook_deliveries"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_nextRetryAt_idx" ON "webhook_deliveries"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_eventType_idx" ON "webhook_deliveries"("eventType");

-- CreateIndex
CREATE INDEX "webhook_deliveries_scheduledAt_idx" ON "webhook_deliveries"("scheduledAt");

-- CreateIndex
CREATE INDEX "notification_batches_status_idx" ON "notification_batches"("status");

-- CreateIndex
CREATE INDEX "notification_batches_tenantId_status_idx" ON "notification_batches"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_batches_scheduledAt_idx" ON "notification_batches"("scheduledAt");

-- CreateIndex
CREATE INDEX "notification_rate_limits_channel_scope_idx" ON "notification_rate_limits"("channel", "scope");

-- CreateIndex
CREATE INDEX "notification_rate_limits_tenantId_idx" ON "notification_rate_limits"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rate_limits_channel_scope_scopeId_tenantId_key" ON "notification_rate_limits"("channel", "scope", "scopeId", "tenantId");

-- CreateIndex
CREATE INDEX "notification_metrics_date_tenantId_idx" ON "notification_metrics"("date", "tenantId");

-- CreateIndex
CREATE INDEX "notification_metrics_date_type_idx" ON "notification_metrics"("date", "type");

-- CreateIndex
CREATE INDEX "notification_metrics_date_channel_idx" ON "notification_metrics"("date", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_metrics_date_hour_tenantId_userId_type_channel_key" ON "notification_metrics"("date", "hour", "tenantId", "userId", "type", "channel", "category");

-- CreateIndex
CREATE INDEX "notification_events_notificationId_idx" ON "notification_events"("notificationId");

-- CreateIndex
CREATE INDEX "notification_events_eventType_idx" ON "notification_events"("eventType");

-- CreateIndex
CREATE INDEX "notification_events_timestamp_idx" ON "notification_events"("timestamp");

-- CreateIndex
CREATE INDEX "notification_audit_logs_entityType_entityId_idx" ON "notification_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "notification_audit_logs_userId_idx" ON "notification_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "notification_audit_logs_tenantId_idx" ON "notification_audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "notification_audit_logs_timestamp_idx" ON "notification_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "notification_rules_eventType_isActive_idx" ON "notification_rules"("eventType", "isActive");

-- CreateIndex
CREATE INDEX "notification_rules_tenantId_isActive_idx" ON "notification_rules"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "notification_providers_type_isActive_idx" ON "notification_providers"("type", "isActive");

-- CreateIndex
CREATE INDEX "notification_providers_tenantId_type_idx" ON "notification_providers"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_providers_name_type_tenantId_key" ON "notification_providers"("name", "type", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "search_index_entityType_entityId_key" ON "search_index"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "applied_promotions_cartId_idx" ON "applied_promotions"("cartId");

-- CreateIndex
CREATE INDEX "applied_promotions_promotionId_idx" ON "applied_promotions"("promotionId");

-- CreateIndex
CREATE INDEX "applied_promotions_orderId_idx" ON "applied_promotions"("orderId");

-- CreateIndex
CREATE INDEX "applied_promotions_appliedAt_idx" ON "applied_promotions"("appliedAt");

-- CreateIndex
CREATE INDEX "inventory_reservations_variantId_idx" ON "inventory_reservations"("variantId");

-- CreateIndex
CREATE INDEX "inventory_reservations_referenceType_referenceId_idx" ON "inventory_reservations"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_idx" ON "inventory_reservations"("status");

-- CreateIndex
CREATE INDEX "inventory_reservations_expiresAt_idx" ON "inventory_reservations"("expiresAt");

-- CreateIndex
CREATE INDEX "inventory_reservations_priority_idx" ON "inventory_reservations"("priority");

-- CreateIndex
CREATE INDEX "cart_price_history_cartItemId_idx" ON "cart_price_history"("cartItemId");

-- CreateIndex
CREATE INDEX "cart_price_history_cartId_idx" ON "cart_price_history"("cartId");

-- CreateIndex
CREATE INDEX "cart_price_history_changedAt_idx" ON "cart_price_history"("changedAt");

-- CreateIndex
CREATE INDEX "cart_audit_logs_cartId_idx" ON "cart_audit_logs"("cartId");

-- CreateIndex
CREATE INDEX "cart_audit_logs_actorId_idx" ON "cart_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "cart_audit_logs_occurredAt_idx" ON "cart_audit_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "cart_audit_logs_action_idx" ON "cart_audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_tenantId_key" ON "roles"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_tenantId_key" ON "user_roles"("userId", "roleId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_key_tenantId_environment_key" ON "configurations"("key", "tenantId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "product_read_models_slug_tenantId_key" ON "product_read_models"("slug", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "order_read_models_orderNumber_tenantId_key" ON "order_read_models"("orderNumber", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_read_models_variantId_tenantId_key" ON "inventory_read_models"("variantId", "tenantId");

-- CreateIndex
CREATE INDEX "archived_data_entityType_entityId_idx" ON "archived_data"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "archived_data_archivedAt_idx" ON "archived_data"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_attributeId_entityType_entityId_key" ON "attribute_values"("attributeId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_access_brandId_sellerId_key" ON "brand_access"("brandId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_intentId_key" ON "payment_intents"("intentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transactionId_key" ON "payment_transactions"("transactionId");

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attributes" ADD CONSTRAINT "attributes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attributes" ADD CONSTRAINT "attributes_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attributes" ADD CONSTRAINT "attributes_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_options" ADD CONSTRAINT "attribute_options_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_localizations" ADD CONSTRAINT "attribute_localizations_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_brands" ADD CONSTRAINT "category_brands_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_brands" ADD CONSTRAINT "category_brands_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_images" ADD CONSTRAINT "variant_images_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_pricing" ADD CONSTRAINT "variant_pricing_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_inventory" ADD CONSTRAINT "variant_inventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "variant_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_accounts" ADD CONSTRAINT "seller_accounts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_wallets" ADD CONSTRAINT "seller_wallets_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_wallet_transactions" ADD CONSTRAINT "seller_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "seller_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_wallet_transactions" ADD CONSTRAINT "seller_wallet_transactions_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "seller_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_wallet_transactions" ADD CONSTRAINT "seller_wallet_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "seller_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_transactions" ADD CONSTRAINT "settlement_transactions_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_transactions" ADD CONSTRAINT "settlement_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_schedules" ADD CONSTRAINT "settlement_schedules_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_schedules" ADD CONSTRAINT "settlement_schedules_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "seller_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_audit_logs" ADD CONSTRAINT "settlement_audit_logs_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_tracking" ADD CONSTRAINT "shipment_tracking_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "notification_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "notification_layouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template_localizations" ADD CONSTRAINT "notification_template_localizations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_layouts" ADD CONSTRAINT "notification_layouts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_layouts" ADD CONSTRAINT "notification_layouts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rate_limits" ADD CONSTRAINT "notification_rate_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_metrics" ADD CONSTRAINT "notification_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_metrics" ADD CONSTRAINT "notification_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audit_logs" ADD CONSTRAINT "notification_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audit_logs" ADD CONSTRAINT "notification_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_providers" ADD CONSTRAINT "notification_providers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_providers" ADD CONSTRAINT "notification_providers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_promotions" ADD CONSTRAINT "applied_promotions_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_promotions" ADD CONSTRAINT "applied_promotions_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_promotions" ADD CONSTRAINT "applied_promotions_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_promotions" ADD CONSTRAINT "applied_promotions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_parentReservationId_fkey" FOREIGN KEY ("parentReservationId") REFERENCES "inventory_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_price_history" ADD CONSTRAINT "cart_price_history_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_price_history" ADD CONSTRAINT "cart_price_history_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_audit_logs" ADD CONSTRAINT "cart_audit_logs_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_requests" ADD CONSTRAINT "brand_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_requests" ADD CONSTRAINT "brand_requests_handledBy_fkey" FOREIGN KEY ("handledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_requests" ADD CONSTRAINT "brand_requests_brandSlug_fkey" FOREIGN KEY ("brandSlug") REFERENCES "brands"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_access" ADD CONSTRAINT "brand_access_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_access" ADD CONSTRAINT "brand_access_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_access" ADD CONSTRAINT "brand_access_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_access" ADD CONSTRAINT "brand_access_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_audit_logs" ADD CONSTRAINT "brand_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_audit_logs" ADD CONSTRAINT "brand_audit_logs_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_audit_logs" ADD CONSTRAINT "category_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_audit_logs" ADD CONSTRAINT "category_audit_logs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
