import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create delivery_personnel table
  await knex.schema.createTable('delivery_personnel', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.string('mobile_number', 15).notNullable();
    table.string('email', 255);
    table.string('vehicle_type', 20); // 'bike', 'scooter', 'bicycle'
    table.string('vehicle_number', 50);
    table.boolean('is_active').defaultTo(true).notNullable();
    table.boolean('is_available').defaultTo(true).notNullable();
    table.decimal('current_latitude', 10, 8);
    table.decimal('current_longitude', 11, 8);
    table.timestamp('location_updated_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('mobile_number');
    table.index('is_active');
    table.index('is_available');
    table.index(['current_latitude', 'current_longitude']); // For location-based queries
  });

  // Create deliveries table
  await knex.schema.createTable('deliveries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').unique().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.uuid('delivery_personnel_id').notNullable().references('id').inTable('delivery_personnel').onDelete('RESTRICT');
    table.string('status', 20).notNullable(); // 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'
    table.jsonb('pickup_location').notNullable(); // { latitude, longitude, address }
    table.jsonb('delivery_location').notNullable(); // { latitude, longitude, address }
    table.timestamp('estimated_delivery_time');
    table.timestamp('actual_delivery_time');
    table.decimal('distance_km', 10, 2);
    table.timestamp('assigned_at');
    table.timestamp('picked_up_at');
    table.timestamp('delivered_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('order_id');
    table.index('delivery_personnel_id');
    table.index('status');
    table.index('assigned_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('deliveries');
  await knex.schema.dropTableIfExists('delivery_personnel');
}
