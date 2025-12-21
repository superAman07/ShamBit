const { Pool } = require('pg');

// Try different database configurations
const configs = [
  {
    host: 'localhost',
    port: 5432,
    database: 'shambit_dev',
    user: 'postgres',
    password: 'postgres'
  },
  {
    host: 'localhost',
    port: 5432,
    database: 'shambit_dev',
    user: 'postgres',
    password: 'password'
  },
  {
    host: 'localhost',
    port: 5432,
    database: 'shambit_dev',
    user: 'postgres',
    password: ''
  }
];

async function checkSellers() {
  for (const config of configs) {
    try {
      console.log(`🔄 Trying connection with password: ${config.password || '(empty)'}`);
      const pool = new Pool(config);
      
      const result = await pool.query(
        `SELECT id, email, status, overall_verification_status, created_at 
         FROM sellers 
         ORDER BY created_at DESC 
         LIMIT 5`
      );
      
      console.log('✅ Connected successfully!');
      console.log('📋 Recent sellers:');
      result.rows.forEach((seller, index) => {
        console.log(`${index + 1}. ${seller.email} - Status: ${seller.status} - Verification: ${seller.overall_verification_status}`);
      });
      
      await pool.end();
      return; // Exit on first successful connection
    } catch (error) {
      console.log(`❌ Failed with this config: ${error.message}`);
    }
  }
  
  console.log('❌ All connection attempts failed');
}

checkSellers();