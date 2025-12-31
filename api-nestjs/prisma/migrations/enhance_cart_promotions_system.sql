-- Enhanced Cart & Promotions System Migration
-- This migration enhances the existing cart and promotions system with enterprise features

-- First, let's add new columns to existing Cart table
ALTER TABLE "carts" 
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS "locale" VARCHAR(10) DEFAULT 'en-IN',
ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50) DEFAULT 'Asia/Kolkata',
ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "shipping_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "available_promotions" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "converted_to_order_id" VARCHAR(30),
ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;

-- Update existing columns to use Decimal for precision
ALTER TABLE "carts" 
ALTER COLUMN "subtotal" TYPE DECIMAL(10,2),
ALTER COLUMN "discount_amount" TYPE DECIMAL(10,2),
ALTER COLUMN "total_amount" TYPE DECIMAL(10,2);

-- Remove unique constraint on userId to allow multiple carts per user
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_userId_key";
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_sessionId_key";

-- Add new indexes for performance
CREATE INDEX IF NOT EXISTS "idx_carts_user_status" ON "carts"("userId", "status") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_carts_session_status" ON "carts"("sessionId", "status") WHERE "sessionId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_carts_expires_at" ON "carts"("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_carts_last_activity" ON "carts"("last_activity_at");

-- Enhance CartItem table
ALTER TABLE "cart_items"
ADD COLUMN IF NOT EXISTS "current_unit_price" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "reservation_expires_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "last_checked_at" TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "variant_snapshot" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "availability_reason" VARCHAR(50);

-- Update existing columns to use Decimal
ALTER TABLE "cart_items"
ALTER COLUMN "unit_price" TYPE DECIMAL(10,2),
ALTER COLUMN "total_price" TYPE DECIMAL(10,2);

-- Set current_unit_price to unit_price for existing records
UPDATE "cart_items" SET "current_unit_price" = "unit_price" WHERE "current_unit_price" IS NULL;

-- Add indexes for cart items
CREATE INDEX IF NOT EXISTS "idx_cart_items_variant" ON "cart_items"("variantId");
CREATE INDEX IF NOT EXISTS "idx_cart_items_seller" ON "cart_items"("sellerId");
CREATE INDEX IF NOT EXISTS "idx_cart_items_reservation" ON "cart_items"("reservationId") WHERE "reservationId" IS NOT NULL;

-- Create AppliedPromotion table
CREATE TABLE IF NOT EXISTS "applied_promotions" (
    "id" VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid(),
    "promotion_id" VARCHAR(30) NOT NULL,
    "promotion_code" VARCHAR(50) NOT NULL,
    "promotion_name" VARCHAR(255) NOT NULL,
    "cart_id" VARCHAR(30),
    "cart_item_id" VARCHAR(30),
    "order_id" VARCHAR(30),
    "discount_type" VARCHAR(50) NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "max_discount_amount" DECIMAL(10,2),
    "priority" INTEGER DEFAULT 0,
    "eligibility_snapshot" JSONB DEFAULT '{}',
    "applied_at" TIMESTAMP DEFAULT NOW(),
    "applied_by" VARCHAR(30),
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints for applied promotions
ALTER TABLE "applied_promotions" 
ADD CONSTRAINT "fk_applied_promotions_promotion" 
FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE;

ALTER TABLE "applied_promotions" 
ADD CONSTRAINT "fk_applied_promotions_cart" 
FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE;

ALTER TABLE "applied_promotions" 
ADD CONSTRAINT "fk_applied_promotions_cart_item" 
FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE CASCADE;

-- Add indexes for applied promotions
CREATE INDEX IF NOT EXISTS "idx_applied_promotions_cart" ON "applied_promotions"("cart_id");
CREATE INDEX IF NOT EXISTS "idx_applied_promotions_promotion" ON "applied_promotions"("promotion_id");
CREATE INDEX IF NOT EXISTS "idx_applied_promotions_order" ON "applied_promotions"("order_id");

-- Create InventoryReservation table (enhanced)
CREATE TABLE IF NOT EXISTS "inventory_reservations" (
    "id" VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid(),
    "variant_id" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_type" VARCHAR(20) NOT NULL, -- 'CART' or 'ORDER'
    "reference_id" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'CONVERTED', 'RELEASED'
    "priority" VARCHAR(20) DEFAULT 'CART', -- 'CART', 'ORDER', 'SYSTEM'
    "expires_at" TIMESTAMP,
    "parent_reservation_id" VARCHAR(30),
    "converted_to_reservation_id" VARCHAR(30),
    "created_by" VARCHAR(30),
    "released_by" VARCHAR(30),
    "released_at" TIMESTAMP,
    "release_reason" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Add foreign key for variant
ALTER TABLE "inventory_reservations" 
ADD CONSTRAINT "fk_inventory_reservations_variant" 
FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE;

-- Add indexes for inventory reservations
CREATE INDEX IF NOT EXISTS "idx_inventory_reservations_variant" ON "inventory_reservations"("variant_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_reservations_reference" ON "inventory_reservations"("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_reservations_expires" ON "inventory_reservations"("expires_at") WHERE "expires_at" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_inventory_reservations_status" ON "inventory_reservations"("status");

-- Create CartPriceHistory table for tracking price changes
CREATE TABLE IF NOT EXISTS "cart_price_history" (
    "id" VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid(),
    "cart_item_id" VARCHAR(30) NOT NULL,
    "old_unit_price" DECIMAL(10,2) NOT NULL,
    "new_unit_price" DECIMAL(10,2) NOT NULL,
    "price_change_reason" VARCHAR(100),
    "changed_at" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "cart_price_history" 
ADD CONSTRAINT "fk_cart_price_history_item" 
FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_cart_price_history_item" ON "cart_price_history"("cart_item_id");
CREATE INDEX IF NOT EXISTS "idx_cart_price_history_changed_at" ON "cart_price_history"("changed_at");

-- Create CartAuditLog table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS "cart_audit_logs" (
    "id" VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid(),
    "cart_id" VARCHAR(30) NOT NULL,
    "action" VARCHAR(50) NOT NULL, -- 'CREATED', 'ITEM_ADDED', 'ITEM_REMOVED', 'PROMOTION_APPLIED', etc.
    "actor_id" VARCHAR(30),
    "actor_type" VARCHAR(20) DEFAULT 'USER', -- 'USER', 'SYSTEM', 'ADMIN'
    "details" JSONB DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "cart_audit_logs" 
ADD CONSTRAINT "fk_cart_audit_logs_cart" 
FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_cart_audit_logs_cart" ON "cart_audit_logs"("cart_id");
CREATE INDEX IF NOT EXISTS "idx_cart_audit_logs_actor" ON "cart_audit_logs"("actor_id");
CREATE INDEX IF NOT EXISTS "idx_cart_audit_logs_occurred_at" ON "cart_audit_logs"("occurred_at");

-- Add check constraints for data integrity
ALTER TABLE "carts" 
ADD CONSTRAINT "chk_carts_status" 
CHECK ("status" IN ('ACTIVE', 'EXPIRED', 'CONVERTED', 'ABANDONED', 'MERGED'));

ALTER TABLE "cart_items" 
ADD CONSTRAINT "chk_cart_items_quantity" 
CHECK ("quantity" > 0);

ALTER TABLE "cart_items" 
ADD CONSTRAINT "chk_cart_items_prices" 
CHECK ("unit_price" >= 0 AND "current_unit_price" >= 0 AND "total_price" >= 0);

ALTER TABLE "inventory_reservations" 
ADD CONSTRAINT "chk_inventory_reservations_status" 
CHECK ("status" IN ('ACTIVE', 'EXPIRED', 'CONVERTED', 'RELEASED'));

ALTER TABLE "inventory_reservations" 
ADD CONSTRAINT "chk_inventory_reservations_quantity" 
CHECK ("quantity" > 0);

-- Create function to update cart totals
CREATE OR REPLACE FUNCTION update_cart_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "carts" 
    SET 
        "subtotal" = (
            SELECT COALESCE(SUM("total_price"), 0) 
            FROM "cart_items" 
            WHERE "cart_id" = NEW."cart_id"
        ),
        "updated_at" = NOW(),
        "last_activity_at" = NOW()
    WHERE "id" = NEW."cart_id";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic cart total updates
DROP TRIGGER IF EXISTS "trigger_update_cart_totals_on_item_change" ON "cart_items";
CREATE TRIGGER "trigger_update_cart_totals_on_item_change"
    AFTER INSERT OR UPDATE OR DELETE ON "cart_items"
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_totals();

-- Create function to clean up expired carts
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE "carts" 
    SET "status" = 'EXPIRED'
    WHERE "status" = 'ACTIVE' 
    AND "expires_at" < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE "inventory_reservations" 
    SET 
        "status" = 'EXPIRED',
        "released_at" = NOW(),
        "release_reason" = 'EXPIRED'
    WHERE "status" = 'ACTIVE' 
    AND "expires_at" < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for all new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trigger_applied_promotions_updated_at"
    BEFORE UPDATE ON "applied_promotions"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "trigger_inventory_reservations_updated_at"
    BEFORE UPDATE ON "inventory_reservations"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default cart statuses into a reference table (optional)
CREATE TABLE IF NOT EXISTS "cart_statuses" (
    "status" VARCHAR(20) PRIMARY KEY,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true
);

INSERT INTO "cart_statuses" ("status", "description") VALUES
('ACTIVE', 'Cart is active and can be modified'),
('EXPIRED', 'Cart has expired due to inactivity'),
('CONVERTED', 'Cart has been converted to an order'),
('ABANDONED', 'Cart was abandoned by the user'),
('MERGED', 'Cart was merged into another cart')
ON CONFLICT ("status") DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_carts_composite_lookup" ON "carts"("userId", "sessionId", "status");
CREATE INDEX IF NOT EXISTS "idx_cart_items_composite_lookup" ON "cart_items"("cartId", "variantId", "sellerId");

-- Add comments for documentation
COMMENT ON TABLE "carts" IS 'Enhanced cart table with multi-seller support and comprehensive tracking';
COMMENT ON TABLE "cart_items" IS 'Cart items with price tracking and reservation support';
COMMENT ON TABLE "applied_promotions" IS 'Track applied promotions with detailed context';
COMMENT ON TABLE "inventory_reservations" IS 'Soft and hard inventory reservations for cart and order items';
COMMENT ON TABLE "cart_price_history" IS 'Track price changes for cart items';
COMMENT ON TABLE "cart_audit_logs" IS 'Comprehensive audit trail for all cart operations';

COMMENT ON COLUMN "carts"."status" IS 'Current status of the cart (ACTIVE, EXPIRED, CONVERTED, ABANDONED, MERGED)';
COMMENT ON COLUMN "carts"."version" IS 'Version number for optimistic locking';
COMMENT ON COLUMN "cart_items"."current_unit_price" IS 'Current price of the item (may differ from unit_price if price changed)';
COMMENT ON COLUMN "inventory_reservations"."priority" IS 'Reservation priority (CART < ORDER < SYSTEM)';