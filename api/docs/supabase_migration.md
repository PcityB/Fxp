# Database Migration Guide - PostgreSQL to Supabase

This guide covers the migration from local PostgreSQL to Supabase for the Forex Pattern Framework.

## Overview

The application has been migrated from local PostgreSQL to Supabase, providing:
- Managed PostgreSQL database
- Automatic backups and scaling
- Built-in authentication and real-time features
- SSL encryption by default
- Dashboard for database management

## Supabase Setup

### Prerequisites

- Supabase account (https://supabase.com)
- Existing project or ability to create a new one

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization
4. Set project name and database password
5. Select region closest to your users
6. Wait for project provisioning (2-3 minutes)

### 2. Get Connection Details

1. Go to Settings → Database in your Supabase dashboard
2. Copy the connection string from "Connection string" section
3. Use the "URI" format for DATABASE_URL
4. Note your project reference ID and password

### 3. Update Environment Configuration

Update your `.env` file in the `api/` directory:

```env
# Supabase Database Configuration
DATABASE_URL=postgresql://postgres:3rfusy7OkcQmT1UY@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
TEST_DATABASE_URL=postgresql://postgres:3rfusy7OkcQmT1UY@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Optional: Supabase API Configuration
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-KEY]

# Other existing configuration
REDIS_URL=redis://localhost:6379/0
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
SECRET_KEY=your-secret-key-here
```

## Migration Process

### 1. Database Schema Migration

The application automatically detects Supabase connections and configures SSL. Run the migration:

```bash
cd api/
python -m db.migration --type all
```

This will:
- Create all required tables
- Initialize system settings
- Check for TimescaleDB extension
- Set up hypertables (if TimescaleDB is available)

### 2. Data Migration (if needed)

If migrating from existing local PostgreSQL:

#### Export Local Data
```bash
# Export existing data
pg_dump -h localhost -U your_user -d your_database > local_backup.sql
```

#### Import to Supabase
```bash
# Import to Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < local_backup.sql
```

### 3. Update Docker Configuration

The Docker Compose has been updated to remove local PostgreSQL:

```bash
# Start services (Redis only, connects to external Supabase)
docker-compose up -d

# Check logs
docker-compose logs api
```

### 4. Test Connection

```bash
# Test database connection
python -c "from db.database import check_db_connection; print('Success!' if check_db_connection() else 'Failed!')"
```

## Code Changes Made

### 1. Database Connection (`api/db/database.py`)

- Added automatic SSL detection for Supabase
- Enhanced error handling with Supabase-specific guidance
- Improved logging for connection status

Key changes:
```python
# Configure SSL for Supabase connections
connect_args = {}
if "supabase.co" in DATABASE_URL:
    connect_args = {"sslmode": "require"}
    logger.info("Detected Supabase connection - enabling SSL")
```

### 2. Migration Script (`api/db/migration.py`)

- Added Supabase detection and handling
- Enhanced TimescaleDB extension checking
- Added database type tracking in system settings

### 3. Configuration Files

- Updated `config.py` with Supabase usage notes
- Enhanced `config_supabase.py` with database URL handling

### 4. Docker Compose (`api/docker-compose.yml`)

- Removed local PostgreSQL service
- Added `.env` file loading
- Updated dependencies

## TimescaleDB on Supabase

### Availability

TimescaleDB may not be available on all Supabase plans. The application handles this gracefully:

- **With TimescaleDB**: Full time-series optimization with hypertables
- **Without TimescaleDB**: Regular PostgreSQL tables (still functional)

### Enabling TimescaleDB

1. Check your Supabase plan for TimescaleDB support
2. Go to Database → Extensions in Supabase dashboard
3. Search for "timescaledb" and enable if available
4. Contact Supabase support if you need TimescaleDB on your plan

## Monitoring and Management

### Supabase Dashboard

Access your database through the Supabase dashboard:
- Real-time metrics and performance
- Query editor for direct SQL access
- Table editor for data management
- Extension management
- Backup and restore options

### Application Monitoring

```python
# Check connection status
from db.database import check_db_connection
if check_db_connection():
    print("Database connection successful")
else:
    print("Database connection failed")
```

### Performance Monitoring

```sql
-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

## Security Considerations

### Automatic Security Features

- **SSL Encryption**: Automatically enabled for all Supabase connections
- **Connection Authentication**: Uses secure connection strings
- **Network Security**: Supabase handles network-level security

### Additional Security Options

1. **Row Level Security (RLS)**: Enable if needed for multi-tenant applications
2. **API Key Management**: Secure your service keys
3. **Database Access Control**: Limit direct database access
4. **Audit Logging**: Available through Supabase dashboard

## Troubleshooting

### Common Issues

#### 1. SSL Connection Errors
```
SSL connection error or timeout
```
**Solution:**
- Verify your connection string is correct
- Check firewall settings
- Ensure you're using the correct project reference

#### 2. Authentication Failures
```
FATAL: password authentication failed
```
**Solution:**
- Verify password in connection string
- Check if project is active in Supabase dashboard
- Reset database password if needed

#### 3. TimescaleDB Not Available
```
TimescaleDB extension is not enabled
```
**Solution:**
- Check Supabase plan for TimescaleDB support
- Enable extension in dashboard if available
- Application will work without TimescaleDB

### Connection Testing

```bash
# Test direct connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -c "SELECT version();"

# Test application connection
python -c "from db.database import check_db_connection; check_db_connection()"
```

### Logs and Debugging

```bash
# Application logs
docker-compose logs api

# Check database initialization
python -c "from db.database import init_db; init_db()"
```

## Backup and Restore

### Automatic Backups

Supabase provides automatic backups:
- Daily backups on free tier
- Point-in-time recovery on paid plans
- Backup retention based on plan

### Manual Backups

```bash
# Create manual backup
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < backup_file.sql
```

## Performance Optimization

### Connection Pooling

For high-traffic applications, consider:
- Supabase built-in connection pooling
- Application-level connection pooling
- Monitoring connection limits

### Query Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_forex_data_symbol_time ON forex_data (symbol, timestamp DESC);
CREATE INDEX idx_processed_data_symbol_time ON processed_data (symbol, timestamp DESC);

-- Monitor slow queries in Supabase dashboard
```

## Production Considerations

1. **Plan Selection**: Choose appropriate Supabase plan for your needs
2. **Connection Limits**: Monitor and upgrade if needed
3. **Backup Strategy**: Ensure backups meet your RTO/RPO requirements
4. **Monitoring**: Set up alerts for database performance
5. **Security**: Review and implement additional security measures
6. **Scaling**: Plan for database scaling as data grows

## Rollback Plan

If you need to rollback to local PostgreSQL:

1. Export data from Supabase:
   ```bash
   pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > supabase_backup.sql
   ```

2. Restore original Docker Compose configuration
3. Update `.env` with local database URL
4. Import data to local PostgreSQL
5. Test application functionality

## Support Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Support**: Available through dashboard
- **Community**: https://github.com/supabase/supabase/discussions
- **Status Page**: https://status.supabase.com/

## Migration Checklist

- [ ] Supabase project created and configured
- [ ] Environment variables updated in `.env`
- [ ] Database schema migrated successfully
- [ ] Data migrated (if applicable)
- [ ] Docker configuration updated
- [ ] Application connection tested
- [ ] TimescaleDB status verified
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team notified of changes

## Next Steps

After successful migration:

1. Monitor application performance
2. Set up database monitoring and alerts
3. Review and optimize queries
4. Plan for data growth and scaling
5. Update deployment procedures
6. Train team on Supabase dashboard usage
