import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create registration sessions table for temporary registration data
  await knex.schema.createTable('registration_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('session_hash', 64).notNullable().unique(); // SHA-256 hash of session ID
    table.string('full_name', 255).notNullable();
    table.string('mobile', 20).notNullable();
    table.string('email', 255).notNullable();
    table.text('encrypted_password').notNullable(); // Encrypted password, not plaintext
    table.boolean('otp_sent').defaultTo(false);
    table.boolean('otp_verified').defaultTo(false);
    table.timestamp('otp_expires_at').nullable(); // OTP expiry timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // Session expiry
    
    // Indexes for performance
    table.index(['session_hash']);
    table.index(['mobile']);
    table.index(['expires_at']);
  });

  // Add cleanup function comment
  await knex.raw(`
    COMMENT ON TABLE registration_sessions IS 'Temporary storage for registration sessions with automatic cleanup';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('registration_sessions');
}