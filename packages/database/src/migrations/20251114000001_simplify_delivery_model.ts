import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Simplify deliveries table
  await knex.schema.alterTable('deliveries', (table) => {
    // Remove complex routing and tracking fields
    table.dropColumn('estimated_delivery_time');
    table.dropColumn('actual_delivery_time');
    table.dropColumn('distance_km');
    table.dropColumn('picked_up_at');
    
    // Keep only essential fields: status, assigned_at, delivered_at
    // Status will be simplified to: 'pending', 'assigned', 'out_for_delivery', 'delivered'
  });

  // Update existing delivery statuses to simplified values
  await knex.raw(`
    UPDATE deliveries 
    SET status = CASE 
      WHEN status = 'assigned' THEN 'assigned'
      WHEN status = 'picked_up' THEN 'out_for_delivery'
      WHEN status = 'in_transit' THEN 'out_for_delivery'
      WHEN status = 'delivered' THEN 'delivered'
      WHEN status = 'failed' THEN 'pending'
      ELSE 'pending'
    END
  `);

  // Simplify delivery_personnel table - remove location tracking
  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.dropColumn('current_latitude');
    table.dropColumn('current_longitude');
    table.dropColumn('location_updated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Restore deliveries table fields
  await knex.schema.alterTable('deliveries', (table) => {
    table.timestamp('estimated_delivery_time');
    table.timestamp('actual_delivery_time');
    table.decimal('distance_km', 10, 2);
    table.timestamp('picked_up_at');
  });

  // Restore delivery_personnel location fields
  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.decimal('current_latitude', 10, 8);
    table.decimal('current_longitude', 11, 8);
    table.timestamp('location_updated_at');
  });
}
