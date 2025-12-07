import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add customer management fields to users table
  await knex.schema.alterTable('users', (table) => {
    table.string('verification_status', 20).notNullable().defaultTo('not_verified');
    table.boolean('is_blocked').notNullable().defaultTo(false);
  });

  // Add CHECK constraint for verification_status
  await knex.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT check_verification_status 
    CHECK (verification_status IN ('verified', 'not_verified', 'suspicious'))
  `);

  // Add indexes for customer management queries
  await knex.schema.alterTable('users', (table) => {
    table.index('verification_status');
    table.index('is_blocked');
  });

  // Create customer_notes table
  await knex.schema.createTable('customer_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('admin_id').notNullable().references('id').inTable('admins');
    table.text('note_text').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('customer_id');
  });

  // Add descending index for created_at using raw SQL
  await knex.raw('CREATE INDEX idx_customer_notes_created_at ON customer_notes(created_at DESC)');

  // Add CHECK constraint for note_text length
  await knex.raw(`
    ALTER TABLE customer_notes 
    ADD CONSTRAINT check_note_text_length 
    CHECK (char_length(note_text) <= 1000)
  `);

  // Create customer_activity_log table
  await knex.schema.createTable('customer_activity_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('admin_id').notNullable().references('id').inTable('admins');
    table.string('action_type', 50).notNullable();
    table.text('reason');
    table.string('old_value', 50);
    table.string('new_value', 50);
    table.string('ip_address', 45);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('customer_id');
  });

  // Add descending index for created_at using raw SQL
  await knex.raw('CREATE INDEX idx_customer_activity_log_created_at ON customer_activity_log(created_at DESC)');
}

export async function down(knex: Knex): Promise<void> {
  // Drop customer management tables
  await knex.schema.dropTableIfExists('customer_activity_log');
  await knex.schema.dropTableIfExists('customer_notes');

  // Remove indexes and columns from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex('verification_status');
    table.dropIndex('is_blocked');
  });

  // Drop CHECK constraints
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS check_verification_status');

  // Remove columns from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('verification_status');
    table.dropColumn('is_blocked');
  });
}
