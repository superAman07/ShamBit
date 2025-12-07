-- Fix incorrect order amounts (divide by 100 to correct the double conversion bug)
-- This script corrects orders that were created with prices multiplied by 100 incorrectly

-- Backup note: Consider backing up your orders table before running this script

-- Fix orders table
UPDATE orders
SET 
  subtotal = subtotal / 100,
  tax_amount = tax_amount / 100,
  delivery_fee = delivery_fee / 100,
  discount_amount = discount_amount / 100,
  total_amount = total_amount / 100
WHERE subtotal > 10000; -- Only fix orders with suspiciously high amounts (> ₹100)

-- Fix order_items table
UPDATE order_items
SET 
  unit_price = unit_price / 100,
  total_price = total_price / 100
WHERE unit_price > 10000; -- Only fix items with suspiciously high prices (> ₹100)

-- Verify the fix
SELECT 
  order_number,
  subtotal,
  tax_amount,
  delivery_fee,
  discount_amount,
  total_amount,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
