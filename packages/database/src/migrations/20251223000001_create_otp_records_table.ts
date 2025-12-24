import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create otp_records table for general OTP functionality (if it doesn't exist)
  const hasOtpRecords = await knex.schema.hasTable('otp_records');
  
  if (!hasOtpRecords) {
    await knex.schema.createTable('otp_records', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('identifier', 50).notNullable(); // Mobile number or email
      table.string('purpose', 50).notNullable(); // 'verification', 'login', etc.
      table.string('otp', 6).nullable(); // Plain text OTP (legacy)
      table.string('otp_hash', 255).nullable(); // Bcrypt hashed OTP (preferred)
      table.integer('attempts').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      
      // Indexes for performance
      table.index(['identifier', 'purpose']);
      table.index('expires_at');
    });

    console.log('✅ Created otp_records table');
  } else {
    console.log('✅ otp_records table already exists');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('otp_records');
}