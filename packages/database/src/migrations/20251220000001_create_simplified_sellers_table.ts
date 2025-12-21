import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create simplified sellers table for the new registration system
  await knex.schema.createTable('simplified_sellers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Basic Registration Data (Required - 4 fields)
    table.string('full_name', 100).notNullable();
    table.string('mobile', 10).notNullable();
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    
    // Verification Status
    table.boolean('mobile_verified').defaultTo(false);
    table.boolean('email_verified').defaultTo(false);
    
    // Progressive Profile Completion (Optional initially)
    table.jsonb('business_details').nullable();
    table.jsonb('address_info').nullable();
    table.jsonb('tax_compliance').nullable();
    table.jsonb('bank_details').nullable();
    
    // Risk and Fraud Detection
    table.integer('risk_score').nullable();
    table.jsonb('risk_flags').nullable();
    table.timestamp('last_risk_assessment').nullable();
    
    // System Fields
    table.enum('status', ['active', 'suspended', 'deactivated']).defaultTo('active');
    table.enum('verification_status', ['pending', 'in_review', 'verified', 'rejected']).defaultTo('pending');
    table.boolean('can_list_products').defaultTo(false);
    table.boolean('payout_enabled').defaultTo(false);
    
    // Audit Fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at').nullable();
    
    // Indexes for performance
    table.index(['mobile']);
    table.index(['email']);
    table.index(['status']);
    table.index(['verification_status']);
    table.index(['created_at']);
    table.index(['mobile_verified']);
    table.index(['can_list_products']);
    
    // Unique constraints
    table.unique(['mobile']);
    table.unique(['email']);
  });

  // Create documents table for file management with versioning
  await knex.schema.createTable('seller_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').notNullable().references('id').inTable('simplified_sellers').onDelete('CASCADE');
    table.enum('type', [
      'pan_card', 
      'gst_certificate', 
      'bank_proof', 
      'aadhaar', 
      'business_certificate', 
      'address_proof', 
      'udyam_certificate'
    ]).notNullable();
    table.string('file_name', 255).notNullable();
    table.string('file_url', 500).notNullable();
    table.string('file_hash', 64).notNullable(); // SHA-256 hash
    table.integer('file_size').notNullable();
    table.integer('version').defaultTo(1);
    table.jsonb('previous_versions').nullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.enum('verification_status', ['pending', 'verified', 'rejected']).defaultTo('pending');
    table.uuid('verified_by').nullable();
    table.timestamp('verified_at').nullable();
    table.text('rejection_reason').nullable();
    table.boolean('checksum_validated').defaultTo(false);
    table.boolean('corruption_detected').defaultTo(false);
    
    // Indexes
    table.index(['seller_id']);
    table.index(['type']);
    table.index(['verification_status']);
    table.index(['uploaded_at']);
    table.index(['file_hash']);
    
    // Unique constraint for seller + document type (only one active document per type)
    table.unique(['seller_id', 'type']);
  });

  // Create audit logs table for compliance
  await knex.schema.createTable('seller_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').notNullable().references('id').inTable('simplified_sellers').onDelete('CASCADE');
    table.string('action', 100).notNullable();
    table.enum('entity_type', ['seller', 'document', 'profile']).notNullable();
    table.string('entity_id', 100).notNullable();
    table.jsonb('old_values').nullable();
    table.jsonb('new_values').nullable();
    table.string('performed_by', 100).notNullable();
    table.timestamp('performed_at').defaultTo(knex.fn.now());
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    
    // Indexes for audit queries
    table.index(['seller_id']);
    table.index(['action']);
    table.index(['entity_type']);
    table.index(['performed_at']);
    table.index(['performed_by']);
  });

  // Create OTP storage table for verification
  await knex.schema.createTable('seller_otps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('mobile', 10).notNullable();
    table.string('otp_hash', 255).notNullable(); // Hashed OTP for security
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('verified').defaultTo(false);
    table.timestamp('verified_at').nullable();
    table.integer('attempts').defaultTo(0);
    table.string('ip_address').nullable();
    
    // Indexes
    table.index(['mobile']);
    table.index(['expires_at']);
    table.index(['created_at']);
    table.index(['verified']);
    
    // Cleanup old OTPs automatically
    table.index(['expires_at']); // For cleanup queries
  });

  // Create rate limiting table for abuse prevention
  await knex.schema.createTable('rate_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('identifier', 100).notNullable(); // IP address, mobile, email, etc.
    table.string('action', 50).notNullable(); // 'otp_request', 'registration', 'login'
    table.integer('count').defaultTo(1);
    table.timestamp('window_start').defaultTo(knex.fn.now());
    table.timestamp('window_end').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['identifier', 'action']);
    table.index(['window_end']);
    table.unique(['identifier', 'action', 'window_start']);
  });

  // Create session management table for JWT tokens
  await knex.schema.createTable('seller_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').notNullable().references('id').inTable('simplified_sellers').onDelete('CASCADE');
    table.string('refresh_token_hash', 255).notNullable();
    table.string('token_family', 100).notNullable(); // For token rotation
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('revoked').defaultTo(false);
    table.timestamp('revoked_at').nullable();
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    
    // Indexes
    table.index(['seller_id']);
    table.index(['refresh_token_hash']);
    table.index(['token_family']);
    table.index(['expires_at']);
    table.index(['revoked']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seller_sessions');
  await knex.schema.dropTableIfExists('rate_limits');
  await knex.schema.dropTableIfExists('seller_otps');
  await knex.schema.dropTableIfExists('seller_audit_logs');
  await knex.schema.dropTableIfExists('seller_documents');
  await knex.schema.dropTableIfExists('simplified_sellers');
}