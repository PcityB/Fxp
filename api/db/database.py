"""
Database connection management for the Forex Pattern Framework.
"""

import os
from sqlalchemy import create_engine
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

# Get database connection details from environment variables or use defaults
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "forex_pattern_db")
DB_USER = os.getenv("DB_USER", "forex_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")

# Construct database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=5,         # Connection pool size
    max_overflow=10,     # Max additional connections
    pool_recycle=3600,   # Recycle connections after 1 hour
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
    """
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Check if TimescaleDB extension is enabled
        with get_db() as db:
            result = db.execute("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'").fetchone()
            if not result:
                logger.warning("TimescaleDB extension is not enabled in the database")
                logger.warning("Time series functionality will be limited")
            else:
                logger.info("TimescaleDB extension is enabled")
                
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

def check_db_connection():
    """
    Check if database connection is working.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return False
