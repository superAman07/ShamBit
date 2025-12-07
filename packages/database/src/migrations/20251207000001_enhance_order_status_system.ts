import { Knex } from 'knex';

/**
 * Migration: Enhance Order Status System for Production
 * 
 * Adds new columns to support:
 * - Enhanced delivery tracking (ready_for_pickup, delivery_attempted)
 * - Hold management (on_hold with reasons)
 * - Return workflow (return_requested, return_approved, etc.)
 * - Refund tracking (refund_initiated, refund_completed)
 * - Delivery attempt tracking
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (table) => {
    // Hold Management
    table.text('on_hold_reason');
    table.timestamp('on_hold_at');
    
    // Enhanced Delivery Tracking
    table.timestamp('ready_for_pickup_at');
    table.timestamp('delivery_attempted_at');
    table.integer('delivery_attempt_count').defaultTo(0);
    table.text('delivery_failure_reason');
    
    // Return Management
    table.timestamp('return_requested_at');
    table.timestamp('return_approved_at');
    table.timestamp('return_rejected_at');
    table.text('return_reason');
    table.text('return_notes');
    table.uuid('return_approved_by');
    
    // Refund Tracking
    table.timestamp('refund_initiated_at');
    table.timestamp('refund_completed_at');
    table.integer('refund_amount'); // Amount refunded (may differ from total_amount)
    table.string('refund_reference', 255); // Payment gateway refund ID
    table.text('refund_notes');
    
    // Delivery Instructions
    table.text('delivery_instructions');
    table.timestamp('delivery_instructions_updated_at');
  });

  // Add indexes for new timestamp columns (for reporting and filtering)
  await knex.schema.alterTable('orders', (table) => {
    table.index('on_hold_at');
    table.index('ready_for_pickup_at');
    table.index('delivery_attempted_at');
    table.index('return_requested_at');
    table.index('refund_initiated_at');
  });

  // Update order_history table to support new action types
  await knex.raw(`
    COMMENT ON COLUMN order_history.action_type IS 
    'Action types: order_created, status_change, payment_status_change, delivery_assignment, delivery_attempt, on_hold, hold_released, cancellation, return_request, return_approval, return_rejection, return_pickup, return_complete, refund_initiated, refund_completed, note, customer_contact, item_substitution';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (table) => {
    // Remove indexes first
    table.dropIndex('on_hold_at');
    table.dropIndex('ready_for_pickup_at');
    table.dropIndex('delivery_attempted_at');
    table.dropIndex('return_requested_at');
    table.dropIndex('refund_initiated_at');
    
    // Remove columns
    table.dropColumn('on_hold_reason');
    table.dropColumn('on_hold_at');
    table.dropColumn('ready_for_pickup_at');
    table.dropColumn('delivery_attempted_at');
    table.dropColumn('delivery_attempt_count');
    table.dropColumn('delivery_failure_reason');
    table.dropColumn('return_requested_at');
    table.dropColumn('return_approved_at');
    table.dropColumn('return_rejected_at');
    table.dropColumn('return_reason');
    table.dropColumn('return_notes');
    table.dropColumn('return_approved_by');
    table.dropColumn('refund_initiated_at');
    table.dropColumn('refund_completed_at');
    table.dropColumn('refund_amount');
    table.dropColumn('refund_reference');
    table.dropColumn('refund_notes');
    table.dropColumn('delivery_instructions');
    table.dropColumn('delivery_instructions_updated_at');
  });
}
