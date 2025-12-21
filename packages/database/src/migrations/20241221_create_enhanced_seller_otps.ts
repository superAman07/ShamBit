import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create enhanced seller OTPs table
  await knex.schema.createTable('seller_otps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('mobile', 10).notNullable().index();
    table.string('otp_hash', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('expires_at').notNullable().index();
    table.boolean('verified').defaultTo(false).notNullable();
    table.timestamp('verified_at').nullable();
    table.integer('attempts').defaultTo(0).notNullable();
    table.string('ip_address', 45).nullable(); // IPv6 support
    table.enum('method', ['sms', 'whatsapp']).defaultTo('sms').notNullable();
    table.enum('delivery_status', ['pending', 'sent', 'delivered', 'failed']).defaultTo('pending').notNullable();
    table.integer('retry_count').defaultTo(0).notNullable();
    table.timestamp('last_retry_at').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for performance
    table.index(['mobile', 'verified', 'expires_at']);
    table.index(['created_at']);
    table.index(['delivery_status']);
    table.index(['ip_address', 'created_at']);
  });

  // Create rate limiting table
  await knex.schema.createTable('rate_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('identifier', 255).notNullable(); // mobile, IP, or user ID
    table.enum('identifier_type', ['mobile', 'ip', 'user', 'device']).notNullable();
    table.string('action', 100).notNullable(); // 'otp_request', 'login', 'registration'
    table.integer('count').defaultTo(1).notNullable();
    table.timestamp('window_start').notNullable();
    table.timestamp('window_end').notNullable();
    table.boolean('blocked').defaultTo(false).notNullable();
    table.timestamp('blocked_until').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Composite index for rate limiting queries
    table.index(['identifier', 'action', 'window_start']);
    table.index(['window_end']); // For cleanup
    table.index(['blocked', 'blocked_until']);
  });

  // Create simplified sellers table
  await knex.schema.createTable('simplified_sellers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Basic registration fields (required)
    table.string('full_name', 100).notNullable();
    table.string('mobile', 10).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    
    // Verification status
    table.boolean('mobile_verified').defaultTo(false).notNullable();
    table.boolean('email_verified').defaultTo(false).notNullable();
    
    // Progressive profile completion (JSON fields)
    table.json('business_details').nullable();
    table.json('address_info').nullable();
    table.json('tax_compliance').nullable();
    table.json('bank_details').nullable();
    
    // Risk and fraud detection
    table.decimal('risk_score', 5, 2).nullable();
    table.json('risk_flags').nullable();
    table.timestamp('last_risk_assessment').nullable();
    table.json('device_fingerprints').nullable();
    table.json('suspicious_activity_flags').nullable();
    
    // Account management
    table.enum('account_status', ['active', 'deactivated', 'deleted']).defaultTo('active').notNullable();
    table.string('deactivation_reason', 500).nullable();
    table.timestamp('deactivated_at').nullable();
    table.timestamp('deletion_scheduled_at').nullable();
    table.boolean('data_export_requested').defaultTo(false).notNullable();
    
    // System fields
    table.enum('status', ['active', 'suspended', 'deactivated']).defaultTo('active').notNullable();
    table.enum('verification_status', ['pending', 'in_review', 'verified', 'rejected']).defaultTo('pending').notNullable();
    table.boolean('can_list_products').defaultTo(false).notNullable();
    table.boolean('payout_enabled').defaultTo(false).notNullable();
    
    // Feature access control
    table.json('feature_access').nullable();
    
    // Service level tracking
    table.json('sla_tracking').nullable();
    
    // Audit fields
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_login_at').nullable();
    table.integer('login_attempts').defaultTo(0).notNullable();
    table.timestamp('last_failed_login_at').nullable();
    table.timestamp('account_locked_until').nullable();

    // Indexes
    table.index(['mobile']);
    table.index(['email']);
    table.index(['status', 'verification_status']);
    table.index(['created_at']);
    table.index(['mobile_verified', 'email_verified']);
    table.index(['can_list_products']);
    table.index(['payout_enabled']);
  });

  // Create seller sessions table for JWT token management
  await knex.schema.createTable('seller_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').notNullable().references('id').inTable('simplified_sellers').onDelete('CASCADE');
    table.string('refresh_token_hash', 255).notNullable();
    table.string('token_family', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('revoked').defaultTo(false).notNullable();
    table.timestamp('revoked_at').nullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();

    // Indexes
    table.index(['seller_id']);
    table.index(['refresh_token_hash']);
    table.index(['token_family']);
    table.index(['expires_at']);
    table.index(['revoked']);
  });

  // Create seller documents table
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
    table.string('mime_type', 100).notNullable();
    table.integer('version').defaultTo(1).notNullable();
    table.json('previous_versions').nullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now()).notNullable();
    table.enum('verification_status', ['pending', 'processing', 'verified', 'rejected']).defaultTo('pending').notNullable();
    table.string('verified_by', 255).nullable();
    table.timestamp('verified_at').nullable();
    table.text('rejection_reason').nullable();
    table.boolean('checksum_validated').defaultTo(false).notNullable();
    table.boolean('corruption_detected').defaultTo(false).notNullable();
    table.decimal('quality_score', 5, 2).nullable();
    table.json('extracted_data').nullable();
    table.json('audit_trail').nullable();
    table.json('retention_policy').nullable();

    // Indexes
    table.index(['seller_id', 'type']);
    table.index(['verification_status']);
    table.index(['uploaded_at']);
    table.index(['file_hash']);
  });

  // Create seller audit logs table
  await knex.schema.createTable('seller_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').nullable().references('id').inTable('simplified_sellers').onDelete('SET NULL');
    table.string('admin_id', 255).nullable();
    table.string('action', 255).notNullable();
    table.enum('entity_type', ['seller', 'document', 'profile', 'payout', 'security']).notNullable();
    table.string('entity_id', 255).notNullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.string('performed_by', 255).notNullable();
    table.timestamp('performed_at').defaultTo(knex.fn.now()).notNullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.string('session_id', 255).nullable();
    table.enum('risk_level', ['low', 'medium', 'high']).defaultTo('low').notNullable();
    table.boolean('compliance_relevant').defaultTo(false).notNullable();
    table.timestamp('retention_period').nullable();
    
    // Enhanced tracking
    table.text('business_justification').nullable();
    table.boolean('approval_required').defaultTo(false).notNullable();
    table.string('approved_by', 255).nullable();
    table.timestamp('approved_at').nullable();
    
    // Compliance fields
    table.boolean('regulatory_reporting').defaultTo(false).notNullable();
    table.enum('data_classification', ['public', 'internal', 'confidential', 'restricted']).defaultTo('internal').notNullable();
    table.boolean('legal_hold').defaultTo(false).notNullable();

    // Indexes
    table.index(['seller_id', 'performed_at']);
    table.index(['entity_type', 'entity_id']);
    table.index(['performed_at']);
    table.index(['compliance_relevant']);
    table.index(['legal_hold']);
  });

  // Create security events table
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').nullable().references('id').inTable('simplified_sellers').onDelete('SET NULL');
    table.enum('event_type', [
      'login_failure', 
      'otp_abuse', 
      'suspicious_device', 
      'rate_limit_exceeded', 
      'account_locked',
      'password_reset',
      'suspicious_activity'
    ]).notNullable();
    table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
    table.string('ip_address', 45).notNullable();
    table.text('user_agent').nullable();
    table.string('device_fingerprint', 255).nullable();
    table.json('metadata').nullable();
    table.boolean('resolved').defaultTo(false).notNullable();
    table.string('resolved_by', 255).nullable();
    table.timestamp('resolved_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index(['seller_id', 'event_type']);
    table.index(['severity', 'resolved']);
    table.index(['created_at']);
    table.index(['ip_address']);
  });

  // Create device fingerprints table
  await knex.schema.createTable('device_fingerprints', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').nullable().references('id').inTable('simplified_sellers').onDelete('SET NULL');
    table.string('fingerprint', 255).notNullable().unique();
    table.timestamp('first_seen').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_seen').defaultTo(knex.fn.now()).notNullable();
    table.boolean('trusted').defaultTo(false).notNullable();
    table.decimal('risk_score', 5, 2).defaultTo(0).notNullable();
    table.json('associated_accounts').nullable();
    table.json('metadata').nullable();

    // Indexes
    table.index(['fingerprint']);
    table.index(['seller_id']);
    table.index(['trusted', 'risk_score']);
    table.index(['last_seen']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('device_fingerprints');
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('seller_audit_logs');
  await knex.schema.dropTableIfExists('seller_documents');
  await knex.schema.dropTableIfExists('seller_sessions');
  await knex.schema.dropTableIfExists('simplified_sellers');
  await knex.schema.dropTableIfExists('rate_limits');
  await knex.schema.dropTableIfExists('seller_otps');
}