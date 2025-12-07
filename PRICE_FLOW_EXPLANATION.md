# Complete Price Flow - How Prices Work in the System

## YES! New products will have correct prices ✅

Here's the complete flow from product creation to order display:

## 1. Product Creation (Admin Portal)

**Input**: Admin enters selling price in rupees
```
Selling Price: ₹85
MRP: ₹98
```

**Database Storage**:
```sql
products table:
- price = 8500 (paise) -- Legacy field, calculated as sellingPrice * 100
- selling_price = 85.00 (rupees) -- Current field
- mrp = 98 (rupees)
```

**Code**: `services/api/src/services/product.service.ts` line 112
```typescript
const priceInPaise = data.price || Math.round(data.sellingPrice * 100);
```

---

## 2. Product Display (Mobile App)

**API Response**: Products returned with prices in rupees
```json
{
  "id": "...",
  "name": "Foxtail Millet – 1 kg",
  "price": 8500,  // paise (legacy, not used in display)
  "sellingPrice": 85.00,  // rupees ✅
  "mrp": 98  // rupees
}
```

**Mobile App Display**:
```kotlin
Text(text = "₹${product.sellingPrice.toInt()}")  // Shows: ₹85
```

---

## 3. Add to Cart

**Process**:
- User adds 6 items to cart
- Cart service fetches product price from database
- **FIXED**: Uses `row.product_price` directly (8500 paise)
- Calculates: 6 × 8500 = 51000 paise

**Cart API Response**: Converts paise to rupees
```json
{
  "items": [{
    "product": {
      "price": 85.00  // Converted: 8500 / 100 = 85
    },
    "quantity": 6
  }],
  "subtotal": 510.00,  // Converted: 51000 / 100 = 510
  "totalAmount": 535.00  // Converted: 53500 / 100 = 535
}
```

**Code**: `services/api/src/routes/cart.routes.ts`
```typescript
subtotal: cart.subtotal / 100,  // Convert paise to rupees
```

---

## 4. Order Creation

**Process**:
- User places order
- Order service validates cart items
- Fetches product prices from database (in paise)
- Calculates totals in paise

**Database Storage**:
```sql
orders table:
- subtotal = 51000 (paise)
- tax_amount = 2500 (paise)
- delivery_fee = 0 (paise)
- total_amount = 53500 (paise)

order_items table:
- unit_price = 8500 (paise)
- quantity = 6
- total_price = 51000 (paise)
```

**Code**: `services/api/src/services/order.service.ts`
```typescript
const itemTotal = product.price * item.quantity;  // 8500 * 6 = 51000 paise
subtotal += itemTotal;
```

---

## 5. Order Display (Mobile App)

**Order API Response**: **NOW FIXED** - Converts paise to rupees
```json
{
  "orderNumber": "ORD-2025-000004",
  "subtotal": 510.00,  // Converted: 51000 / 100
  "taxAmount": 25.00,  // Converted: 2500 / 100
  "totalAmount": 535.00,  // Converted: 53500 / 100
  "items": [{
    "productName": "Foxtail Millet – 1 kg",
    "unitPrice": 85.00,  // Converted: 8500 / 100
    "quantity": 6,
    "totalPrice": 510.00  // Converted: 51000 / 100
  }]
}
```

**Code**: `services/api/src/routes/order.routes.ts` (NEW)
```typescript
const convertOrderToRupees = (order: any) => {
  return {
    ...order,
    subtotal: order.subtotal / 100,
    taxAmount: order.taxAmount / 100,
    totalAmount: order.totalAmount / 100,
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: item.unitPrice / 100,
      totalPrice: item.totalPrice / 100,
    })),
  };
};
```

**Mobile App Display**:
```kotlin
Text(text = formatCurrency(order.totalAmount))  // Shows: ₹535.00
```

---

## Summary: Price Convention

| Component | Storage/Display | Example |
|-----------|----------------|---------|
| **Database - products.price** | Paise (legacy) | 8500 |
| **Database - products.selling_price** | Rupees | 85.00 |
| **Database - orders.total_amount** | Paise | 53500 |
| **Database - order_items.unit_price** | Paise | 8500 |
| **Product API Response** | Rupees | 85.00 |
| **Cart API Response** | Rupees (converted) | 510.00 |
| **Order API Response** | Rupees (converted) ✅ | 535.00 |
| **Mobile App Display** | Rupees | ₹535.00 |

---

## What Was Fixed?

### Before:
1. ❌ Cart service was double-converting prices (×100 when already in paise)
2. ❌ Order API was NOT converting paise to rupees
3. ❌ Inconsistent behavior between cart and order APIs

### After:
1. ✅ Cart service uses prices directly from database (no double conversion)
2. ✅ Order API converts paise to rupees (consistent with cart API)
3. ✅ All APIs return prices in rupees to mobile app
4. ✅ Database stores in paise (smallest unit, no rounding errors)
5. ✅ Mobile app displays rupees correctly

---

## Testing New Products

To verify new products work correctly:

1. **Create Product** (Admin Portal):
   - Enter: Selling Price = ₹100, MRP = ₹120
   - Database stores: price = 10000 paise, selling_price = 100.00

2. **View Product** (Mobile App):
   - Should display: ₹100

3. **Add to Cart** (6 items):
   - Cart should show: ₹600 subtotal

4. **Place Order**:
   - Order should show: ₹600 subtotal, ₹630 total (with tax)

5. **View Order Details**:
   - Should display: ₹630.00 total
   - Item price: ₹100 × 6 = ₹600

All amounts will be correct! ✅
