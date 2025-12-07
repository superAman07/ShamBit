-- Add free delivery threshold setting if it doesn't exist
INSERT INTO settings (key, value, description, value_type)
VALUES ('free_delivery_threshold', '50000', 'Minimum order amount for free delivery in paise (₹500)', 'number')
ON CONFLICT (key) DO NOTHING;
