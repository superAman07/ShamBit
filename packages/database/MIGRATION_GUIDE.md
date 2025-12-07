# Database Schema Simplification - Migration Guide

## Prerequisites

Before running the migration, ensure:

1. **PostgreSQL is running**
   ```bash
   # Check if PostgreSQL is running on port 5433
   netstat -an | findstr "5433"
   
   # Or check PostgreSQL service status
   # Windows: Check Services app for PostgreSQL
   # Linux/Mac: sudo systemctl status postgresql
   ```

2. **Database exists**
   ```bash
   psql -h localhost -p 5433 -U postgres -l
   ```

3. **Environment variables are set**
   - Check `.env` file has correct database credentials
   - Verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

4. **All previous migrations have run**
   ```bash
   cd packages/database
   npm run migrate:status
   ```

## Migration Steps

### Step 1: Backup Database (Recommended)

```bash
# Create a backup before running the migration
pg_dump -h localhost -p 5433 -U postgres -d shambit_dev > backup_before_simplification.sql

# Or use pg_dumpall for all databases
pg_dumpall -h localhost -p 5433 -U postgres > backup_all_before_simplification.sql
```

### Step 2: Run the Migration

```bash
cd packages/database
npm run migrate:latest
```

Expected output:
```
🔄 Starting database schema simplification...
📋 Phase 1: Removing complex caching indexes...
✅ Dropped partial indexes for caching
📋 Phase 2: Removing analytics-focused indexes...
✅ Dropped analytics-focused indexes
📋 Phase 3: Removing complex composite indexes...
✅ Dropped complex composite indexes
📋 Phase 4: Optimizing indexes for operational queries...
✅ Optimized indexes for operational queries
📋 Phase 5: Verifying unused tables are removed...
✅ Verified all unused tables are removed
🎉 Database schema simplification completed successfully!
```

### Step 3: Verify the Migration

```bash
# Run verification script
psql -h localhost -p 5433 -U postgres -d shambit_dev -f scripts/verify-schema-simplification.sql

# Or manually check
psql -h localhost -p 5433 -U postgres -d shambit_dev
```

In psql, run:
```sql
-- Check migration status
SELECT * FROM knex_migrations ORDER BY run_on DESC LIMIT 5;

-- Verify unused tables are gone
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('warehouses', 'aggregated_metrics', 'product_batches', 'batch_movements');

-- Count remaining indexes
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';

-- Check specific table indexes
\d+ orders
\d+ products
\d+ inventory
```

### Step 4: Test Application

```bash
# Start the API service
cd services/api
npm run dev

# Test key endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/products
curl http://localhost:3000/api/v1/orders
```

## Troubleshooting

### Issue: Database Connection Failed

**Error**: `AggregateError` or connection timeout

**Solution**:
1. Verify PostgreSQL is running
2. Check port 5433 is correct
3. Verify credentials in `.env`
4. Test connection manually:
   ```bash
   psql -h localhost -p 5433 -U postgres -d shambit_dev
   ```

### Issue: Migration Already Run

**Error**: Migration already executed

**Solution**:
- This is normal if migration was already applied
- Check migration status:
  ```bash
  npm run migrate:status
  ```

### Issue: Index Drop Failed

**Error**: Index does not exist

**Solution**:
- This is handled by the migration (uses `DROP INDEX IF EXISTS`)
- Migration will continue and complete successfully

### Issue: Performance Degradation

**Symptom**: Queries are slower after migration

**Solution**:
1. Check slow query logs
2. Analyze specific slow queries:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';
   ```
3. If needed, rollback migration:
   ```bash
   npm run migrate:rollback
   ```

## Rollback Procedure

If you need to rollback the migration:

```bash
cd packages/database
npm run migrate:rollback
```

This will:
- Restore all removed indexes
- Restore partial indexes for caching
- Restore analytics indexes
- Restore complex composite indexes

## Post-Migration Checklist

- [ ] Database backup created
- [ ] Migration executed successfully
- [ ] Verification script run
- [ ] Unused tables confirmed removed
- [ ] Complex indexes confirmed removed
- [ ] Essential indexes confirmed present
- [ ] API service starts without errors
- [ ] Health check endpoint responds
- [ ] Product listing works
- [ ] Order creation works
- [ ] Inventory queries work
- [ ] Delivery assignment works

## Performance Monitoring

After migration, monitor:

1. **Query Performance**
   ```sql
   -- Enable pg_stat_statements extension
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   
   -- Check slow queries
   SELECT 
       query,
       calls,
       mean_exec_time,
       max_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 100
   ORDER BY mean_exec_time DESC
   LIMIT 20;
   ```

2. **Application Logs**
   - Check for slow query warnings (> 1 second)
   - Monitor API response times
   - Watch for database connection errors

3. **Database Size**
   ```sql
   SELECT pg_size_pretty(pg_database_size('shambit_dev'));
   ```

## Expected Results

### Before Migration
- ~50+ indexes across all tables
- Complex partial indexes for caching
- Analytics-focused composite indexes
- Unused tables (warehouses, batches, analytics)

### After Migration
- ~30 essential indexes
- No partial indexes
- No analytics indexes
- Only operational tables remain

### Performance Impact
- Queries: 10-50ms slower (acceptable for startup scale)
- Writes: Faster (fewer indexes to update)
- Database size: Smaller (fewer indexes)
- Maintenance: Simpler (fewer indexes to manage)

## Support

If you encounter issues:

1. Check the logs in `services/api/logs/`
2. Review the migration file: `src/migrations/20251114000002_simplify_database_schema.ts`
3. Consult the documentation: `DATABASE_SCHEMA_SIMPLIFICATION.md`
4. Run the verification script: `scripts/verify-schema-simplification.sql`

## Next Steps

After successful migration:

1. Update task status in `.kiro/specs/startup-simplification/tasks.md`
2. Proceed to task 12: Update package dependencies
3. Continue with remaining simplification tasks
