const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shambit_dev',
  user: 'postgres',
  password: 'postgres123'
});

async function approveSeller(email) {
  try {
    const result = await pool.query(
      `UPDATE sellers 
       SET status = 'approved', 
           overall_verification_status = 'approved',
           updated_at = NOW()
       WHERE email = $1 
       RETURNING id, email, status, overall_verification_status`,
      [email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Seller approved successfully:', result.rows[0]);
    } else {
      console.log('❌ No seller found with email:', email);
    }
  } catch (error) {
    console.error('❌ Error approving seller:', error.message);
  } finally {
    await pool.end();
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'priya.sharma@greengrocers.com';
console.log('🔄 Approving seller with email:', email);

approveSeller(email);