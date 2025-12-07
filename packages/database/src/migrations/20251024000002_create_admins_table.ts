import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('admins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 50).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('role', 30).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('username');
    table.index('is_active');
    table.index('role');
  });

  await knex.schema.createTable('admin_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('admin_id').notNullable().references('id').inTable('admins');
    table.string('action', 100).notNullable();
    table.string('resource_type', 50).notNullable();
    table.string('resource_id', 255).notNullable();
    table.jsonb('changes');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('admin_id');
    table.index('action');
    table.index('resource_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_audit_logs');
  await knex.schema.dropTableIfExists('admins');
}
