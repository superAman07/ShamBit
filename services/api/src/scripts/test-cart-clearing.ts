/**
 * Manual test script to verify cart clearing after order creation
 * 
 * This script tests:
 * 1. Cart items are cleared after COD order
 * 2. Cart items are cleared after successful online payment
 * 3. Promo codes are cleared from cart
 * 
 * Usage: Run this script with a test user ID and verify the cart is empty after order creation
 */

import { getDatabase } from '@shambit/database';
import { orderService } from '../services/order.service';
import { cartService } from '../services/cart.service';

const db = getDatabase();

async function testCartClearingAfterCODOrder() {
  console.log('\n=== Testing Cart Clearing After COD Order ===\n');
  
  // This is a manual test - you need to:
  // 1. Create a test user
  // 2. Add items to their cart
  // 3. Apply a promo code (optional)
  // 4. Create a COD order
  // 5. Verify cart is empty
  
  const testUserId = 'YOUR_TEST_USER_ID'; // Replace with actual test user ID
  
  try {
    // Check cart before order
    console.log('Checking cart before order...');
    const cartBefore = await cartService.getCart(testUserId);
    console.log(`Cart items before: ${cartBefore.items.length}`);
    console.log(`Promo code before: ${cartBefore.promoCode || 'None'}`);
    
    if (cartBefore.items.length === 0) {
      console.log('⚠️  Cart is empty. Please add items to cart first.');
      return;
    }
    
    // Create COD order (you need to provide valid data)
    console.log('\nCreating COD order...');
    // const order = await orderService.createOrder(testUserId, {
    //   deliveryAddressId: 'YOUR_ADDRESS_ID',
    //   items: cartBefore.items.map(item => ({
    //     productId: item.productId,
    //     quantity: item.quantity
    //   })),
    //   paymentMethod: 'cod',
    //   promoCode: cartBefore.promoCode
    // });
    // console.log(`Order created: ${order.order.orderNumber}`);
    
    // Check cart after order
    console.log('\nChecking cart after order...');
    const cartAfter = await cartService.getCart(testUserId);
    console.log(`Cart items after: ${cartAfter.items.length}`);
    console.log(`Promo code after: ${cartAfter.promoCode || 'None'}`);
    
    // Verify cart is empty
    if (cartAfter.items.length === 0 && !cartAfter.promoCode) {
      console.log('\n✅ SUCCESS: Cart cleared after COD order');
    } else {
      console.log('\n❌ FAILED: Cart not cleared properly');
      console.log(`   - Items remaining: ${cartAfter.items.length}`);
      console.log(`   - Promo code remaining: ${cartAfter.promoCode || 'None'}`);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

async function testCartClearingAfterOnlinePayment() {
  console.log('\n=== Testing Cart Clearing After Online Payment ===\n');
  
  // This test requires:
  // 1. Creating an online payment order
  // 2. Simulating payment success webhook
  // 3. Verifying cart is cleared
  
  console.log('This test requires manual payment webhook simulation.');
  console.log('Steps:');
  console.log('1. Create an order with payment_method="online"');
  console.log('2. Trigger payment success webhook with valid signature');
  console.log('3. Verify cart is empty after payment success');
}

async function verifyCartClearingInDatabase() {
  console.log('\n=== Verifying Cart Clearing Logic in Database ===\n');
  
  const testUserId = 'YOUR_TEST_USER_ID'; // Replace with actual test user ID
  
  try {
    // Check cart_items table
    const cartItems = await db('cart_items')
      .where('user_id', testUserId)
      .select('*');
    
    console.log(`Cart items in database: ${cartItems.length}`);
    
    // Check cart_promo_codes table
    const promoCode = await db('cart_promo_codes')
      .where('user_id', testUserId)
      .first();
    
    console.log(`Promo code in database: ${promoCode ? promoCode.promo_code : 'None'}`);
    
    if (cartItems.length === 0 && !promoCode) {
      console.log('\n✅ Cart is properly cleared in database');
    } else {
      console.log('\n⚠️  Cart data still exists in database');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('Cart Clearing Integration Test');
  console.log('='.repeat(60));
  
  console.log('\n⚠️  IMPORTANT: This is a manual test script.');
  console.log('Please update the test user ID and follow the instructions.\n');
  
  // Uncomment the tests you want to run:
  // await testCartClearingAfterCODOrder();
  // await testCartClearingAfterOnlinePayment();
  // await verifyCartClearingInDatabase();
  
  console.log('\n' + '='.repeat(60));
  console.log('Test completed');
  console.log('='.repeat(60) + '\n');
  
  process.exit(0);
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testCartClearingAfterCODOrder, testCartClearingAfterOnlinePayment, verifyCartClearingInDatabase };
