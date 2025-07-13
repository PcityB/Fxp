# PostgreSQL and TimescaleDB Setup Guide

This guide provides instructions for setting up PostgreSQL with TimescaleDB extension for the Forex Pattern Framework.

## Prerequisites

- Linux, macOS, or Windows operating system
- Administrative privileges for installing software
- Basic knowledge of command-line operations

## 1. Installing PostgreSQL

### Ubuntu/Debian

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update

# Install PostgreSQL 14
sudo apt-get install -y postgresql-14

# Verify installation
sudo systemctl status postgresql
```

### macOS

```bash
# Using Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14
```

### Windows

1. Download the PostgreSQL installer from the [official website](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the installation wizard
3. Keep the default port (5432) and remember the password you set for the postgres user
4. Complete the installation

## 2. Installing TimescaleDB Extension

### Ubuntu/Debian

```bash
# Add TimescaleDB repository
sudo sh -c 'echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -cs) main" > /etc/apt/sources.list.d/timescaledb.list'
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt-get update

# Install TimescaleDB for PostgreSQL 14
sudo apt-get install -y timescaledb-2-postgresql-14

# Configure TimescaleDB
sudo timescaledb-tune --quiet --yes

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### macOS

```bash
# Using Homebrew
brew install timescaledb

# Configure TimescaleDB
timescaledb-tune --quiet --yes

# Restart PostgreSQL
brew services restart postgresql@14
```

### Windows

1. Download the TimescaleDB installer from the [official website](https://docs.timescale.com/install/latest/self-hosted/installation-windows/)
2. Run the installer and follow the installation wizard
3. The installer will automatically configure PostgreSQL

## 3. Creating the Database and User

Connect to PostgreSQL and create the database and user for the Forex Pattern Framework:

```bash
# Connect to PostgreSQL as the postgres user
sudo -u postgres psql

# Create a new user (replace 'forex_user' and 'your_password' with your preferred values)
CREATE USER forex_user WITH PASSWORD 'your_password';

# Create a new database
CREATE DATABASE forex_pattern_db;

# Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE forex_pattern_db TO forex_user;

# Connect to the new database
\c forex_pattern_db

# Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Exit PostgreSQL
\q
```

## 4. Configuring the Forex Pattern Framework

Update the database connection settings in the Forex Pattern Framework:

1. Create a `.env` file in the `/home/ubuntu/forex_pattern_framework/api` directory:

```bash
# Create .env file
cat > /home/ubuntu/forex_pattern_framework/api/.env << EOL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forex_pattern_db
DB_USER=forex_user
DB_PASSWORD=your_password
EOL
```

2. Update the database connection string in `/home/ubuntu/forex_pattern_framework/api/db/database.py`:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database connection settings
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "forex_pattern_db")
DB_USER = os.getenv("DB_USER", "forex_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")

# Create SQLAlchemy engine
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
Base = declarative_base()

@contextmanager
def get_db():
    """
    Context manager for database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## 5. Installing Required Python Packages

Install the required Python packages for PostgreSQL and TimescaleDB:

```bash
pip install sqlalchemy psycopg2-binary python-dotenv
```

## 6. Initializing the Database Schema

Run the database initialization script to create all tables and hypertables:

```bash
cd /home/ubuntu/forex_pattern_framework/api
python -c "from db.database import Base, engine; from db.models import *; Base.metadata.create_all(bind=engine)"
```

## 7. Migrating Existing Data

Use the provided migration utility to transfer existing data from files to the database:

```bash
cd /home/ubuntu/forex_pattern_framework/api
python -c "from db.migration import DataMigration; migration = DataMigration(); migration.migrate_all()"
```

## 8. Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Check if PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify PostgreSQL is listening on the correct port:
   ```bash
   sudo netstat -tuln | grep 5432
   ```

3. Check PostgreSQL logs for errors:
   ```bash
   sudo tail -n 100 /var/log/postgresql/postgresql-14-main.log
   ```

4. Ensure the PostgreSQL configuration allows connections:
   ```bash
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   ```
   Add or modify the following line:
   ```
   host    all             all             127.0.0.1/32            md5
   ```

5. Restart PostgreSQL after making changes:
   ```bash
   sudo systemctl restart postgresql
   ```

### TimescaleDB Issues

If TimescaleDB is not working correctly:

1. Verify the extension is installed:
   ```bash
   sudo -u postgres psql -d forex_pattern_db -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"
   ```

2. If not installed, create the extension:
   ```bash
   sudo -u postgres psql -d forex_pattern_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
   ```

3. Check if hypertables are created:
   ```bash
   sudo -u postgres psql -d forex_pattern_db -c "SELECT * FROM timescaledb_information.hypertables;"
   ```

### Python Package Issues

If you encounter issues with Python packages:

1. Verify the required packages are installed:
   ```bash
   pip list | grep -E 'sqlalchemy|psycopg2|dotenv'
   ```

2. Reinstall the packages if needed:
   ```bash
   pip install --upgrade sqlalchemy psycopg2-binary python-dotenv
   ```

## 9. Testing the Database Connection

To test the database connection:

```bash
cd /home/ubuntu/forex_pattern_framework/api
python tests/test_db_integration.py
```

If all tests pass, the database is correctly set up and ready to use.

## 10. Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
