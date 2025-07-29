"""
Database connection management for the Forex Pattern Framework.
Supports both local PostgreSQL and Supabase with automatic SSL configuration.
"""

from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('database')

# Get database connection details from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://")

# Configure SSL for Supabase connections
connect_args = {}
if "supabase.co" in DATABASE_URL or "supabase.com" in DATABASE_URL:
    connect_args = {"sslmode": "require"}
    logger.info("Detected Supabase connection - enabling SSL")
else:
    logger.info("Using local PostgreSQL connection")

# Create SQLAlchemy engine with conditional SSL configuration
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=5,         # Connection pool size
    max_overflow=10,     # Max additional connections
    pool_recycle=3600,   # Recycle connections after 1 hour
    connect_args=connect_args
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for ORM models
Base = declarative_base()

@contextmanager
def get_db():
    """
    Context manager for database sessions.
    
    Usage:
        with get_db() as db:
            db.query(Model).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        db.close()

def init_db():
    """
    Initialize database by creating all tables.
    Works with both local PostgreSQL and Supabase.
    """
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Check if TimescaleDB extension is enabled
        with get_db() as db:
            try:
                result = db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'")).fetchone()
                if not result:
                    logger.warning("TimescaleDB extension is not enabled in the database")
                    if "supabase.co" in DATABASE_URL or "supabase.com" in DATABASE_URL:
                        logger.info("For Supabase: TimescaleDB may need to be enabled via dashboard or support")
                    else:
                        logger.warning("To enable TimescaleDB locally, run: CREATE EXTENSION IF NOT EXISTS timescaledb;")
                    logger.warning("Time series functionality will be limited without TimescaleDB")
                else:
                    logger.info("TimescaleDB extension is enabled")
            except Exception as ext_error:
                logger.warning(f"Could not check TimescaleDB extension: {str(ext_error)}")
                logger.info("Continuing without TimescaleDB verification")
                
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        if "supabase.co" in DATABASE_URL or "supabase.com" in DATABASE_URL:
            logger.error("Check your Supabase connection string and ensure the database is accessible")
        raise

def check_db_connection():
    """
    Check if database connection is working.
    Provides specific guidance for Supabase connections.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        if "supabase.co" in DATABASE_URL or "supabase.com" in DATABASE_URL:
            logger.error("Supabase connection troubleshooting:")
            logger.error("1. Verify your DATABASE_URL in .env file")
            logger.error("2. Check if your Supabase project is active")
            logger.error("3. Ensure SSL is properly configured")
            logger.error("4. Verify database credentials are correct")
        return False
