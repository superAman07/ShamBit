require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'shambit_dev',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Setup Tables (Auto-run for dev convenience)
const initDB = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(100),
        gstin VARCHAR(50),
        owner_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(20) CHECK (type IN ('buyer', 'seller')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log("Database tables initialized.");
    } catch (err) {
        console.error("Error organizing database:", err);
    }
};

initDB();

// Routes

// 1. Register Seller
app.post('/api/register-seller', async (req, res) => {
    const { businessName, businessType, gstin, ownerName, phone, email, city } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO sellers (business_name, business_type, gstin, owner_name, phone, email, city) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [businessName, businessType, gstin, ownerName, phone, email, city]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// 2. Notify Me
app.post('/api/notify', async (req, res) => {
    const { email, type } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO waitlist (email, type) VALUES ($1, $2) RETURNING *',
            [email, type]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }
        console.error(err);
        res.status(500).json({ success: false, error: 'Validation failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
