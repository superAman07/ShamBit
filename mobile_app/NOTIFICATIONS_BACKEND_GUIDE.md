# Notifications Backend Implementation Guide

## Quick Start

The mobile app now has a fully functional notifications screen. To make it work end-to-end, implement these backend endpoints.

## Required API Endpoints

### 1. Get Notification History
```
GET /api/v1/notifications/history
```

**Query Parameters:**
- `limit` (optional, default: 20) - Number of notifications per page
- `offset` (optional, default: 0) - Pagination offset

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "notif_abc123",
        "userId": "user_123",
        "type": "order_confirmed",
        "channel": "push",
        "title": "Order Confirmed! 🎉",
        "body": "Your order #12345 has been confirmed and will be delivered soon",
        "data": {
          "orderId": "order_12345",
          "orderNumber": "12345"
        },
        "status": "sent",
        "sentAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "hasMore": true
    }
  }
}
```

### 2. Mark Notification as Read (Optional - Future)
```
PUT /api/v1/notifications/{notificationId}/read
```

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 3. Mark All Notifications as Read (Optional - Future)
```
PUT /api/v1/notifications/read-all
```

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 4. Delete Notification (Optional - Future)
```
DELETE /api/v1/notifications/{notificationId}
```

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### 5. Register Device Token for Push Notifications
```
POST /api/v1/notifications/device-token
```

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Request Body:**
```json
{
  "token": "fcm_device_token_here",
  "platform": "android",
  "deviceId": "unique_device_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

## Notification Types

Use these standardized notification types:

| Type | When to Send | Title Example | Body Example |
|------|--------------|---------------|--------------|
| `order_confirmed` | Order confirmed | "Order Confirmed! 🎉" | "Your order #12345 has been confirmed" |
| `order_preparing` | Order being prepared | "Order is Being Prepared" | "Your order #12345 is being prepared" |
| `order_shipped` | Order shipped | "Order Shipped! 📦" | "Your order #12345 has been shipped" |
| `order_out_for_delivery` | Out for delivery | "Out for Delivery! 🚚" | "Your order #12345 is out for delivery" |
| `order_delivered` | Order delivered | "Order Delivered! ✅" | "Your order #12345 has been delivered" |
| `order_cancelled` | Order cancelled | "Order Cancelled" | "Your order #12345 has been cancelled" |
| `payment_success` | Payment successful | "Payment Successful! 💳" | "Payment of ₹500 received for order #12345" |
| `payment_failed` | Payment failed | "Payment Failed" | "Payment failed for order #12345. Please retry" |
| `offer` | Promotional offer | "Special Offer! 🎁" | "Get 20% off on your next order" |
| `wishlist` | Wishlist item on sale | "Wishlist Item on Sale! ❤️" | "Product XYZ is now on sale" |

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'push',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSON,
  status VARCHAR(20) DEFAULT 'sent',
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type),
  INDEX idx_deleted_at (deleted_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Device Tokens Table
```sql
CREATE TABLE device_tokens (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,
  device_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_token (token(255)),
  INDEX idx_is_active (is_active),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Implementation Example (Node.js/Express)

### Get Notification History
```javascript
router.get('/notifications/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get notifications
    const notifications = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND deleted_at IS NULL 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    // Get total count
    const [{ total }] = await db.query(
      `SELECT COUNT(*) as total FROM notifications 
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
    
    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: notifications.map(n => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          channel: n.channel,
          title: n.title,
          body: n.body,
          data: n.data ? JSON.parse(n.data) : null,
          status: n.status,
          sentAt: n.sent_at,
          createdAt: n.created_at
        })),
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});
```

### Send Notification Function
```javascript
async function sendNotification(userId, type, title, body, data = {}) {
  try {
    // Save to database
    const notificationId = generateId();
    await db.query(
      `INSERT INTO notifications 
       (id, user_id, type, channel, title, body, data, status, sent_at, created_at) 
       VALUES (?, ?, ?, 'push', ?, ?, ?, 'sent', NOW(), NOW())`,
      [notificationId, userId, type, title, body, JSON.stringify(data)]
    );
    
    // Get user's device tokens
    const tokens = await db.query(
      `SELECT token FROM device_tokens 
       WHERE user_id = ? AND is_active = TRUE`,
      [userId]
    );
    
    // Send push notification via FCM
    if (tokens.length > 0) {
      await sendFCMNotification(
        tokens.map(t => t.token),
        title,
        body,
        data
      );
    }
    
    return notificationId;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
```

### Usage Examples

#### When Order is Confirmed
```javascript
await sendNotification(
  userId,
  'order_confirmed',
  'Order Confirmed! 🎉',
  `Your order #${orderNumber} has been confirmed and will be delivered soon`,
  {
    orderId: order.id,
    orderNumber: order.orderNumber
  }
);
```

#### When Order is Delivered
```javascript
await sendNotification(
  userId,
  'order_delivered',
  'Order Delivered! ✅',
  `Your order #${orderNumber} has been delivered successfully`,
  {
    orderId: order.id,
    orderNumber: order.orderNumber
  }
);
```

#### When Payment Fails
```javascript
await sendNotification(
  userId,
  'payment_failed',
  'Payment Failed',
  `Payment failed for order #${orderNumber}. Please retry`,
  {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.totalAmount
  }
);
```

## Firebase Cloud Messaging (FCM) Setup

### 1. Install Firebase Admin SDK
```bash
npm install firebase-admin
```

### 2. Initialize Firebase
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

### 3. Send Push Notification
```javascript
async function sendFCMNotification(tokens, title, body, data) {
  const message = {
    notification: {
      title,
      body
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    tokens
  };
  
  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications`);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      // Deactivate failed tokens
      await deactivateTokens(failedTokens);
    }
  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
}
```

## Testing

### Test with cURL

#### Get Notifications
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/history?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Register Device Token
```bash
curl -X POST "http://localhost:3000/api/v1/notifications/device-token" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm_token_here",
    "platform": "android",
    "deviceId": "device_123"
  }'
```

## Performance Optimization

1. **Indexing**: Add indexes on `user_id`, `created_at`, and `is_read`
2. **Pagination**: Always use limit/offset for large datasets
3. **Caching**: Cache recent notifications in Redis
4. **Batch Processing**: Send notifications in batches
5. **Async Processing**: Use queue (Bull, RabbitMQ) for notification sending
6. **Cleanup**: Regularly archive old notifications (>90 days)

## Security Considerations

1. **Authentication**: Always verify JWT token
2. **Authorization**: Users can only access their own notifications
3. **Rate Limiting**: Limit API calls per user
4. **Input Validation**: Validate all input parameters
5. **SQL Injection**: Use parameterized queries
6. **XSS Prevention**: Sanitize notification content

## Monitoring

Track these metrics:
- Notification delivery rate
- Notification open rate
- Failed notification count
- API response times
- Database query performance

## Next Steps

1. ✅ Implement GET /notifications/history endpoint
2. ✅ Set up database tables
3. ✅ Integrate FCM for push notifications
4. ✅ Add notification triggers in order flow
5. ✅ Test end-to-end flow
6. ⬜ Implement mark as read endpoint
7. ⬜ Implement delete endpoint
8. ⬜ Add analytics tracking
9. ⬜ Set up monitoring and alerts

## Support

For questions or issues, contact the mobile team.
