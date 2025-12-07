# Notifications Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              NotificationsScreen.kt                 │    │
│  │  (UI Layer - Jetpack Compose)                      │    │
│  │                                                     │    │
│  │  • Display notifications list                      │    │
│  │  • Handle user interactions                        │    │
│  │  • Show loading/error/empty states                 │    │
│  │  • Swipe to dismiss                                │    │
│  │  • Navigate to related content                     │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
│                     │ observes state                         │
│                     │ calls actions                          │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │           NotificationsViewModel.kt                 │    │
│  │  (ViewModel Layer - Business Logic)                │    │
│  │                                                     │    │
│  │  • Manage UI state (StateFlow)                     │    │
│  │  • Load notifications (pagination)                 │    │
│  │  • Mark as read/delete                             │    │
│  │  • Handle errors                                   │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
│                     │ calls API                              │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │                ProfileApi.kt                        │    │
│  │  (Data Layer - Retrofit)                           │    │
│  │                                                     │    │
│  │  • GET /notifications/history                      │    │
│  │  • PUT /notifications/{id}/read                    │    │
│  │  • DELETE /notifications/{id}                      │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Notifications Controller                    │    │
│  │                                                     │    │
│  │  • GET /api/v1/notifications/history               │    │
│  │  • PUT /api/v1/notifications/{id}/read             │    │
│  │  • DELETE /api/v1/notifications/{id}               │    │
│  │  • POST /api/v1/notifications/device-token         │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Notifications Service                       │    │
│  │                                                     │    │
│  │  • Business logic                                  │    │
│  │  • Validation                                      │    │
│  │  • Notification creation                           │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Database (MySQL/PostgreSQL)            │    │
│  │                                                     │    │
│  │  • notifications table                             │    │
│  │  • device_tokens table                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Loading Notifications

```
User Opens Screen
       │
       ▼
NotificationsScreen
       │
       │ LaunchedEffect(Unit)
       ▼
ViewModel.loadNotifications()
       │
       │ Update state: isLoading = true
       ▼
ProfileApi.getNotificationHistory()
       │
       │ HTTP GET Request
       ▼
Backend API
       │
       │ Query Database
       ▼
Database
       │
       │ Return notifications
       ▼
Backend API
       │
       │ Format Response
       ▼
ProfileApi
       │
       │ Parse Response
       ▼
ViewModel
       │
       │ Update state: notifications = data
       │              isLoading = false
       ▼
NotificationsScreen
       │
       │ Recompose with new state
       ▼
Display Notifications List
```

### 2. User Taps Notification

```
User Taps Notification
       │
       ▼
NotificationsScreen.onClick()
       │
       │ Extract orderId from notification.data
       ▼
ViewModel.markAsRead(notificationId)
       │
       │ Update local state
       │ (Optional: Call API to persist)
       ▼
Navigate to OrderDetailScreen
       │
       ▼
Show Order Details
```

### 3. User Swipes to Delete

```
User Swipes Left
       │
       ▼
SwipeToDismiss Component
       │
       │ Detect swipe gesture
       ▼
NotificationsScreen.onDismiss()
       │
       ▼
ViewModel.deleteNotification(id)
       │
       │ Remove from local state
       │ (Optional: Call API to persist)
       ▼
NotificationsScreen
       │
       │ Recompose without deleted item
       ▼
Notification Removed from List
```

### 4. Pagination (Load More)

```
User Scrolls to Bottom
       │
       ▼
LazyColumn detects end
       │
       ▼
ViewModel.loadNotifications()
       │
       │ Check: !isLoading && hasMore
       │ Increment page number
       │ Update state: isLoading = true
       ▼
ProfileApi.getNotificationHistory(offset = page * 20)
       │
       │ HTTP GET Request
       ▼
Backend API
       │
       │ Query Database with OFFSET
       ▼
Database
       │
       │ Return next 20 notifications
       ▼
Backend API
       │
       ▼
ProfileApi
       │
       ▼
ViewModel
       │
       │ Append to existing notifications
       │ Update state: isLoading = false
       ▼
NotificationsScreen
       │
       │ Recompose with more items
       ▼
Display More Notifications
```

## State Management

### NotificationsState
```kotlin
data class NotificationsState(
    val notifications: List<Notification> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val hasMore: Boolean = true
)
```

### State Transitions

```
Initial State
    ↓
    notifications = []
    isLoading = false
    error = null
    hasMore = true

Loading State
    ↓
    notifications = []
    isLoading = true
    error = null
    hasMore = true

Success State
    ↓
    notifications = [n1, n2, n3, ...]
    isLoading = false
    error = null
    hasMore = true/false

Error State
    ↓
    notifications = []
    isLoading = false
    error = "Error message"
    hasMore = true

Loading More State
    ↓
    notifications = [n1, n2, n3, ...]
    isLoading = true
    error = null
    hasMore = true

Success with More State
    ↓
    notifications = [n1, n2, ..., n21, n22, ...]
    isLoading = false
    error = null
    hasMore = true/false
```

## Navigation Flow

```
┌─────────────────┐
│   Home Screen   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Profile Screen  │
└────────┬────────┘
         │
         │ Tap "Notifications"
         ▼
┌──────────────────────┐
│ Notifications Screen │
└────────┬─────────────┘
         │
         ├─── Tap Order Notification ──→ Order Detail Screen
         │
         ├─── Tap Product Notification ─→ Product Detail Screen
         │
         ├─── Tap Offer Notification ───→ Home Screen (Offers)
         │
         └─── Back Button ──────────────→ Profile Screen
```

## Component Hierarchy

```
NotificationsScreen
│
├── Scaffold
│   │
│   ├── TopAppBar
│   │   ├── Back Button
│   │   ├── Title ("Notifications")
│   │   └── Mark All Read Button
│   │
│   └── Content
│       │
│       ├── Loading State
│       │   └── CircularProgressIndicator
│       │
│       ├── Error State
│       │   ├── Error Icon
│       │   ├── Error Message
│       │   └── Retry Button
│       │
│       ├── Empty State
│       │   ├── Empty Icon
│       │   ├── Empty Message
│       │   └── Empty Subtitle
│       │
│       └── Success State
│           └── LazyColumn
│               ├── NotificationItem 1
│               │   └── SwipeToDismiss
│               │       ├── Icon (Type-based)
│               │       ├── Title
│               │       ├── Body
│               │       ├── Time
│               │       └── Unread Indicator
│               │
│               ├── NotificationItem 2
│               ├── NotificationItem 3
│               ├── ...
│               │
│               └── Loading More Indicator
```

## Notification Type Mapping

```
Backend Type          →  Mobile Icon       →  Color
─────────────────────────────────────────────────────
order_confirmed       →  CheckCircle       →  Green
order_preparing       →  Restaurant        →  Blue
order_shipped         →  LocalShipping     →  Blue
order_out_for_delivery→  LocalShipping     →  Blue
order_delivered       →  Done              →  Green
order_cancelled       →  Cancel            →  Red
payment_success       →  Payment           →  Green
payment_failed        →  ErrorOutline      →  Red
offer                 →  LocalOffer        →  Orange
promotion             →  LocalOffer        →  Orange
wishlist              →  Favorite          →  Pink
default               →  Notifications     →  Primary
```

## Error Handling

```
API Call
    │
    ├─── Success (200) ──→ Parse Response ──→ Update State
    │
    ├─── Client Error (4xx)
    │    │
    │    ├─── 401 Unauthorized ──→ Navigate to Login
    │    ├─── 404 Not Found ─────→ Show "No notifications"
    │    └─── Other ─────────────→ Show Error Message
    │
    ├─── Server Error (5xx) ──→ Show "Server error, try again"
    │
    └─── Network Error ───────→ Show "Check your connection"
```

## Performance Optimizations

### 1. Lazy Loading
```
LazyColumn
    │
    ├── Only renders visible items
    ├── Recycles views
    └── Minimal memory usage
```

### 2. Pagination
```
Load 20 items at a time
    │
    ├── Reduces initial load time
    ├── Reduces memory usage
    └── Smooth scrolling
```

### 3. State Management
```
StateFlow
    │
    ├── Only recomposes when state changes
    ├── Efficient updates
    └── No unnecessary renders
```

### 4. Key Usage
```
LazyColumn(items = notifications, key = { it.id })
    │
    └── Efficient list updates
        └── Only changed items recompose
```

## Security Considerations

```
Mobile App
    │
    ├── JWT Token in Headers
    │   └── Authorization: Bearer {token}
    │
    ├── HTTPS Only
    │   └── Encrypted communication
    │
    ├── Token Refresh
    │   └── Automatic token renewal
    │
    └── User-specific Data
        └── Backend validates user_id
```

## Testing Strategy

### Unit Tests
```
NotificationsViewModel
    │
    ├── Test loadNotifications()
    ├── Test pagination
    ├── Test markAsRead()
    ├── Test deleteNotification()
    └── Test error handling
```

### UI Tests
```
NotificationsScreen
    │
    ├── Test empty state display
    ├── Test loading state display
    ├── Test error state display
    ├── Test notification list display
    ├── Test swipe to delete
    ├── Test tap to navigate
    └── Test mark all as read
```

### Integration Tests
```
End-to-End Flow
    │
    ├── Login → Profile → Notifications
    ├── Load notifications from API
    ├── Tap notification → Navigate
    └── Swipe to delete → Update API
```

## Deployment Checklist

- [x] Mobile code complete
- [x] Navigation integrated
- [x] Error handling implemented
- [x] Loading states implemented
- [x] Empty states implemented
- [ ] Backend API implemented
- [ ] Database schema created
- [ ] Push notifications configured
- [ ] Unit tests written
- [ ] UI tests written
- [ ] Integration tests written
- [ ] Performance testing done
- [ ] Security audit done
- [ ] Documentation complete
- [ ] QA testing done
- [ ] Production deployment

## Monitoring & Analytics

### Track These Events
```
• notification_screen_viewed
• notification_tapped (with type)
• notification_deleted
• notification_marked_read
• notifications_loaded (with count)
• notification_error (with error type)
```

### Track These Metrics
```
• Average notifications per user
• Notification open rate
• Notification delete rate
• Time to first notification
• API response time
• Error rate
```

---

This architecture provides a scalable, maintainable, and performant notifications system that follows Android best practices and industry standards.
