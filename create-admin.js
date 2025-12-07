const bcrypt = require('bcrypt');

async function createAdmin() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash:', hash);
  console.log('\nRun this SQL command:');
  console.log(`UPDATE admins SET password_hash = '${hash}' WHERE username = 'admin';`);
}

createAdmin();
