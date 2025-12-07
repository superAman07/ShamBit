import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create order_history table
  await knex.schema.createTable('order_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.string('action_type', 50).notNullable(); // 'order_created', 'status_change', 'delivery_assignment', 'cancellation', 'return', 'note'
    table.string('old_value', 100);
    table.string('new_value', 100);
    table.text('reason');
    table.text('note');
    table.uuid('admin_id').references('id').inTable('admins');
    table.string('admin_email', 255);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('order_id');
    table.index(['created_at'], 'idx_order_history_created_desc', {
      indexType: 'btree',
      storageEngineIndexType: 'btree',
    });
  });

  // Add CHECK constraint on note column to prevent empty notes
  await knex.raw(`
    ALTER TABLE order_history 
    ADD CONSTRAINT chk_order_history_note_not_empty 
    CHECK (note IS NULL OR trim(note) != '')
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop CHECK constraint first
  await knex.raw('ALTER TABLE order_history DROP CONSTRAINT IF EXISTS chk_order_history_note_not_empty');
  
  await knex.schema.dropTableIfExists('order_history');
}
