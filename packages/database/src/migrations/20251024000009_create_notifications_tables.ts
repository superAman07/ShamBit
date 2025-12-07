import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Device tokens table
  await knex.schema.createTable('device_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 500).notNullable();
    table.enum('platform', ['android', 'ios', 'web']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('token');
    table.unique(['user_id', 'token']);
  });

  // Notification preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('push_enabled').defaultTo(true);
    table.boolean('sms_enabled').defaultTo(true);
    table.boolean('email_enabled').defaultTo(true);
    table.boolean('promotional_enabled').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index
    table.index('user_id');
  });

  // Notification history table
  await knex.schema.createTable('notification_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 50).notNullable();
    table.enum('channel', ['push', 'sms', 'email']).notNullable();
    table.string('title', 255).notNullable();
    table.text('body').notNullable();
    table.jsonb('data');
    table.enum('status', ['sent', 'failed', 'pending']).defaultTo('pending');
    table.text('error_message');
    table.timestamp('sent_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('type');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_history');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('device_tokens');
}
