-- ============================================
-- SQL Verification Queries for Testing
-- Tasks 7, 8, and 9
-- ============================================

-- ============================================
-- TASK 7: PROMOTIONS
-- ============================================

-- View all active promotions
SELECT 
    id,
    code,
    description,
    discount_type,
    discount_value,
    min_order_value,
    usage_count,
    usage_limit,
    per_user_limit,
    start_date,
    end_date,
    is_active
FROM promotions
WHERE is_active = true
ORDER BY created_at DESC;

-- View promotion usage for a specific code
SELECT 
    p.code,
    p.usage_count,
    p.usage_limit,
    pu.user_id,
    u.mobile_number,
    o.order_number,
    pu.discount_amount,
    pu.used_at
FROM promotion_usage pu
JOIN promotions p ON pu.promotion_id = p.id
JOIN users u ON pu.user_id = u.id
JOIN orders o ON pu.order_id = o.id
WHERE p.code = 'WELCOME10'
ORDER BY pu.used_at DESC;

-- Check how many times a user has used a promotion
SELECT 
    u.mobile_number,
    p.code,
    COUNT(*) as times_used,
    p.per_user_limit
FROM promotion_usage pu
JOIN users u ON pu.user_id = u.id
JOIN promotions p ON pu.promotion_id = p.id
WHERE u.id = '<user-id>'
AND p.code = 'WELCOME10'
GROUP BY u.mobile_number, p.code, p.per_user_limit;

-- View orders with promotions applied
SELECT 
    o.order_number,
    o.subtotal,
    o.discount_amount,
    o.total_amount,
    o.promo_code,
    o.status,
    o.payment_status,
    u.mobile_number
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.promo_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 20;

-- Promotion effectiveness report
SELECT 
    p.code,
    p.description,
    p.discount_type,
    COUNT(pu.id) as total_uses,
    SUM(pu.discount_amount) as total_discount_given,
    AVG(pu.discount_amount) as avg_discount_per_use,
    p.usage_limit,
    p.is_active
FROM promotions p
LEFT JOIN promotion_usage pu ON p.id = pu.promotion_id
GROUP BY p.id, p.code, p.description, p.discount_type, p.usage_limit, p.is_active
ORDER BY total_uses DESC;

-- ============================================
-- TASK 8: DELIVERY MANAGEMENT
-- ============================================

-- View all delivery personnel with their status
SELECT 
    id,
    name,
    mobile_number,
    vehicle_type,
    vehicle_number,
    is_active,
    is_available,
    current_latitude,
    current_longitude,
    location_updated_at
FROM delivery_personnel
ORDER BY name;

-- View active deliveries
SELECT 
    d.id as delivery_id,
    o.order_number,
    dp.name as delivery_person,
    dp.mobile_number,
    d.status,
    d.estimated_delivery_time,
    d.distance_km,
    d.assigned_at,
    d.picked_up_at,
    d.delivered_at,
    u.mobile_number as customer_mobile
FROM deliveries d
JOIN orders o ON d.order_id = o.id
JOIN delivery_personnel dp ON d.delivery_personnel_id = dp.id
JOIN users u ON o.user_id = u.id
WHERE d.status IN ('assigned', 'picked_up', 'in_transit')
ORDER BY d.assigned_at DESC;

-- View delivery history for a specific order
SELECT 
    d.id as delivery_id,
    o.order_number,
    dp.name as delivery_person,
    dp.mobile_number as delivery_mobile,
    d.status,
    d.pickup_location,
    d.delivery_location,
    d.estimated_delivery_time,
    d.actual_delivery_time,
    d.distance_km,
    d.assigned_at,
    d.picked_up_at,
    d.delivered_at,
    EXTRACT(EPOCH FROM (d.delivered_at - d.assigned_at)) / 60 as delivery_time_minutes
FROM deliveries d
JOIN orders o ON d.order_id = o.id
JOIN delivery_personnel dp ON d.delivery_personnel_id = dp.id
WHERE o.order_number = '<order-number>';

-- Delivery personnel performance statistics
SELECT 
    dp.id,
    dp.name,
    dp.mobile_number,
    COUNT(d.id) as total_deliveries,
    COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed_deliveries,
    COUNT(CASE WHEN d.status = 'failed' THEN 1 END) as failed_deliveries,
    ROUND(AVG(
        CASE 
            WHEN d.status = 'delivered' AND d.assigned_at IS NOT NULL AND d.delivered_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (d.delivered_at - d.assigned_at)) / 60
        END
    )::numeric, 2) as avg_delivery_time_minutes,
    ROUND(
        COUNT(CASE WHEN d.status = 'delivered' AND d.delivered_at <= d.estimated_delivery_time THEN 1 END)::numeric * 100.0 / 
        NULLIF(COUNT(CASE WHEN d.status = 'delivered' THEN 1 END), 0),
        2
    ) as on_time_delivery_rate
FROM delivery_personnel dp
LEFT JOIN deliveries d ON dp.id = d.delivery_personnel_id
GROUP BY dp.id, dp.name, dp.mobile_number
ORDER BY completed_deliveries DESC;

-- Current workload of delivery personnel
SELECT 
    dp.id,
    dp.name,
    dp.is_available,
    COUNT(d.id) as active_deliveries
FROM delivery_personnel dp
LEFT JOIN deliveries d ON dp.id = d.delivery_personnel_id 
    AND d.status IN ('assigned', 'picked_up', 'in_transit')
WHERE dp.is_active = true
GROUP BY dp.id, dp.name, dp.is_available
ORDER BY active_deliveries ASC, dp.name;

-- Orders ready for delivery assignment
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.delivery_address,
    o.created_at,
    CASE 
        WHEN EXISTS (SELECT 1 FROM deliveries WHERE order_id = o.id)
        THEN 'Assigned'
        ELSE 'Not Assigned'
    END as delivery_status
FROM orders o
WHERE o.status IN ('confirmed', 'preparing')
AND o.payment_status = 'completed'
ORDER BY o.created_at ASC;

-- Delivery metrics for a date range
SELECT 
    DATE(d.assigned_at) as delivery_date,
    COUNT(d.id) as total_deliveries,
    COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as completed,
    COUNT(CASE WHEN d.status = 'failed' THEN 1 END) as failed,
    ROUND(AVG(d.distance_km)::numeric, 2) as avg_distance_km,
    ROUND(AVG(
        CASE 
            WHEN d.status = 'delivered' AND d.assigned_at IS NOT NULL AND d.delivered_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (d.delivered_at - d.assigned_at)) / 60
        END
    )::numeric, 2) as avg_delivery_time_minutes
FROM deliveries d
WHERE d.assigned_at >= '2025-10-01' AND d.assigned_at < '2025-11-01'
GROUP BY DATE(d.assigned_at)
ORDER BY delivery_date DESC;

-- ============================================
-- TASK 9: NOTIFICATIONS
-- ============================================

-- View all device tokens for a user
SELECT 
    dt.id,
    dt.token,
    dt.platform,
    dt.is_active,
    dt.created_at,
    dt.updated_at,
    u.mobile_number
FROM device_tokens dt
JOIN users u ON dt.user_id = u.id
WHERE u.id = '<user-id>'
ORDER BY dt.created_at DESC;

-- View notification preferences for all users
SELECT 
    u.mobile_number,
    np.push_enabled,
    np.sms_enabled,
    np.email_enabled,
    np.promotional_enabled,
    np.updated_at
FROM notification_preferences np
JOIN users u ON np.user_id = u.id
ORDER BY u.mobile_number;

-- View notification history for a user
SELECT 
    nh.id,
    nh.type,
    nh.channel,
    nh.title,
    nh.body,
    nh.data,
    nh.status,
    nh.error_message,
    nh.sent_at,
    nh.created_at
FROM notification_history nh
WHERE nh.user_id = '<user-id>'
ORDER BY nh.created_at DESC
LIMIT 50;

-- Notification delivery statistics by type
SELECT 
    type,
    channel,
    COUNT(*) as total_sent,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    ROUND(
        COUNT(CASE WHEN status = 'sent' THEN 1 END)::numeric * 100.0 / COUNT(*),
        2
    ) as success_rate
FROM notification_history
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type, channel
ORDER BY total_sent DESC;

-- Recent notifications across all users
SELECT 
    u.mobile_number,
    nh.type,
    nh.title,
    nh.status,
    nh.sent_at,
    nh.error_message
FROM notification_history nh
JOIN users u ON nh.user_id = u.id
ORDER BY nh.created_at DESC
LIMIT 100;

-- Failed notifications that need investigation
SELECT 
    u.mobile_number,
    nh.type,
    nh.title,
    nh.error_message,
    nh.created_at,
    dt.token,
    dt.platform,
    dt.is_active
FROM notification_history nh
JOIN users u ON nh.user_id = u.id
LEFT JOIN device_tokens dt ON nh.user_id = dt.user_id
WHERE nh.status = 'failed'
AND nh.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY nh.created_at DESC;

-- Notification engagement by user
SELECT 
    u.mobile_number,
    COUNT(nh.id) as total_notifications,
    COUNT(CASE WHEN nh.type = 'promotional' THEN 1 END) as promotional_count,
    COUNT(CASE WHEN nh.type LIKE 'order_%' THEN 1 END) as order_notifications,
    COUNT(CASE WHEN nh.type LIKE 'delivery_%' THEN 1 END) as delivery_notifications,
    MAX(nh.sent_at) as last_notification_sent
FROM users u
LEFT JOIN notification_history nh ON u.id = nh.user_id AND nh.status = 'sent'
GROUP BY u.id, u.mobile_number
HAVING COUNT(nh.id) > 0
ORDER BY total_notifications DESC
LIMIT 50;

-- Users with disabled notifications
SELECT 
    u.mobile_number,
    np.push_enabled,
    np.sms_enabled,
    np.email_enabled,
    np.promotional_enabled,
    COUNT(dt.id) as registered_tokens
FROM users u
LEFT JOIN notification_preferences np ON u.id = np.user_id
LEFT JOIN device_tokens dt ON u.id = dt.user_id AND dt.is_active = true
WHERE np.push_enabled = false OR np.promotional_enabled = false
GROUP BY u.id, u.mobile_number, np.push_enabled, np.sms_enabled, np.email_enabled, np.promotional_enabled;

-- Inactive device tokens (not used in 30 days)
SELECT 
    u.mobile_number,
    dt.token,
    dt.platform,
    dt.is_active,
    dt.updated_at,
    EXTRACT(DAY FROM (NOW() - dt.updated_at)) as days_inactive
FROM device_tokens dt
JOIN users u ON dt.user_id = u.id
WHERE dt.updated_at < NOW() - INTERVAL '30 days'
ORDER BY dt.updated_at ASC;

-- ============================================
-- INTEGRATION QUERIES
-- ============================================

-- Complete order flow with all related data
SELECT 
    o.order_number,
    o.status as order_status,
    o.payment_status,
    o.total_amount,
    o.discount_amount,
    o.promo_code,
    u.mobile_number as customer,
    d.status as delivery_status,
    dp.name as delivery_person,
    COUNT(nh.id) as notifications_sent
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN deliveries d ON o.id = d.order_id
LEFT JOIN delivery_personnel dp ON d.delivery_personnel_id = dp.id
LEFT JOIN notification_history nh ON o.user_id = nh.user_id 
    AND nh.data::text LIKE '%' || o.id || '%'
WHERE o.order_number = '<order-number>'
GROUP BY o.id, o.order_number, o.status, o.payment_status, o.total_amount, 
         o.discount_amount, o.promo_code, u.mobile_number, d.status, dp.name;

-- Orders with promotions and their delivery status
SELECT 
    o.order_number,
    o.promo_code,
    o.discount_amount,
    o.status as order_status,
    d.status as delivery_status,
    dp.name as delivery_person,
    u.mobile_number
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN deliveries d ON o.id = d.order_id
LEFT JOIN delivery_personnel dp ON d.delivery_personnel_id = dp.id
WHERE o.promo_code IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 50;

-- Delivery personnel with their current assignments and notification status
SELECT 
    dp.name,
    dp.mobile_number,
    dp.is_available,
    COUNT(DISTINCT d.id) as active_deliveries,
    COUNT(DISTINCT nh.id) as notifications_sent_today
FROM delivery_personnel dp
LEFT JOIN deliveries d ON dp.id = d.delivery_personnel_id 
    AND d.status IN ('assigned', 'picked_up', 'in_transit')
LEFT JOIN orders o ON d.order_id = o.id
LEFT JOIN notification_history nh ON o.user_id = nh.user_id 
    AND DATE(nh.created_at) = CURRENT_DATE
    AND nh.type IN ('delivery_assigned', 'order_out_for_delivery')
WHERE dp.is_active = true
GROUP BY dp.id, dp.name, dp.mobile_number, dp.is_available
ORDER BY active_deliveries DESC;

-- ============================================
-- CLEANUP QUERIES (USE WITH CAUTION!)
-- ============================================

-- Delete test notifications
-- DELETE FROM notification_history 
-- WHERE user_id IN (
--     SELECT id FROM users WHERE mobile_number LIKE '+9199%'
-- );

-- Delete test device tokens
-- DELETE FROM device_tokens 
-- WHERE user_id IN (
--     SELECT id FROM users WHERE mobile_number LIKE '+9199%'
-- );

-- Delete test promotion usage
-- DELETE FROM promotion_usage 
-- WHERE user_id IN (
--     SELECT id FROM users WHERE mobile_number LIKE '+9199%'
-- );

-- Delete test deliveries
-- DELETE FROM deliveries 
-- WHERE order_id IN (
--     SELECT id FROM orders WHERE user_id IN (
--         SELECT id FROM users WHERE mobile_number LIKE '+9199%'
--     )
-- );

-- Delete test delivery personnel
-- DELETE FROM delivery_personnel 
-- WHERE mobile_number LIKE '+9199%';

-- Delete test promotions
-- DELETE FROM promotions 
-- WHERE code LIKE 'TEST%';

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- System health check
SELECT 
    'Orders' as entity,
    COUNT(*) as total,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
FROM orders
UNION ALL
SELECT 
    'Deliveries',
    COUNT(*),
    COUNT(CASE WHEN assigned_at >= NOW() - INTERVAL '24 hours' THEN 1 END)
FROM deliveries
UNION ALL
SELECT 
    'Notifications',
    COUNT(*),
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)
FROM notification_history
UNION ALL
SELECT 
    'Promotions Used',
    COUNT(*),
    COUNT(CASE WHEN used_at >= NOW() - INTERVAL '24 hours' THEN 1 END)
FROM promotion_usage;

-- Error rate monitoring
SELECT 
    'Notifications' as service,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as errors,
    COUNT(*) as total,
    ROUND(
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::numeric * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as error_rate_percent
FROM notification_history
WHERE created_at >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'Deliveries',
    COUNT(CASE WHEN status = 'failed' THEN 1 END),
    COUNT(*),
    ROUND(
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::numeric * 100.0 / NULLIF(COUNT(*), 0),
        2
    )
FROM deliveries
WHERE assigned_at >= NOW() - INTERVAL '1 hour';
