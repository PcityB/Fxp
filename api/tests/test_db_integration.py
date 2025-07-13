"""
Test script for PostgreSQL database integration with the forex pattern framework.
"""

import os
import sys
import json
import pandas as pd
import logging
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import get_db, engine, Base
from db.models import (
    ForexData, ProcessedData, Pattern, PatternInstance, 
    PatternPerformance, Visualization, SystemSetting
)
from db.repository import ProcessedDataRepository, PatternRepository, AnalysisRepository
from db.migration import DataMigration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('db_test')

def test_database_connection():
    """Test database connection."""
    logger.info("Testing database connection...")
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return False

def test_database_initialization():
    """Test database initialization."""
    logger.info("Testing database initialization...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Check if TimescaleDB extension is enabled
        with engine.connect() as conn:
            result = conn.execute("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'").fetchone()
            if not result:
                logger.warning("TimescaleDB extension is not enabled in the database")
                logger.warning("Time series functionality will be limited")
            else:
                logger.info("TimescaleDB extension is enabled")
                
                # Create hypertables
                try:
                    conn.execute("SELECT create_hypertable('forex_data', 'timestamp', if_not_exists => TRUE);")
                    conn.execute("SELECT create_hypertable('processed_data', 'timestamp', if_not_exists => TRUE);")
                    logger.info("Hypertables created successfully")
                except Exception as e:
                    logger.error(f"Error creating hypertables: {str(e)}")
        
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False

def test_system_settings():
    """Test system settings."""
    logger.info("Testing system settings...")
    try:
        with get_db() as db:
            # Check if settings already exist
            settings = db.query(SystemSetting).all()
            if not settings:
                # Create default settings
                storage_mode = SystemSetting(
                    setting_key="storage_mode",
                    setting_value={"primary": "database", "fallback": "file"},
                    description="Storage mode configuration"
                )
                
                file_paths = SystemSetting(
                    setting_key="file_storage_paths",
                    setting_value={
                        "processed_data": "data/processed",
                        "patterns": "data/patterns",
                        "analysis": "data/analysis"
                    },
                    description="File storage paths for fallback mode"
                )
                
                db_version = SystemSetting(
                    setting_key="database_version",
                    setting_value="1.0",
                    description="Current database schema version"
                )
                
                db.add(storage_mode)
                db.add(file_paths)
                db.add(db_version)
                db.commit()
                
                logger.info("System settings initialized")
            else:
                logger.info(f"Found {len(settings)} existing system settings")
                for setting in settings:
                    logger.info(f"  {setting.setting_key}: {setting.setting_value}")
        
        return True
    except Exception as e:
        logger.error(f"System settings test failed: {str(e)}")
        return False

def test_processed_data_repository():
    """Test processed data repository."""
    logger.info("Testing processed data repository...")
    try:
        # Create sample data
        dates = pd.date_range(start='2023-01-01', periods=100, freq='H')
        data = {
            'open': [100 + i * 0.1 for i in range(100)],
            'high': [101 + i * 0.1 for i in range(100)],
            'low': [99 + i * 0.1 for i in range(100)],
            'close': [100.5 + i * 0.1 for i in range(100)],
            'volume': [1000 + i * 10 for i in range(100)]
        }
        df = pd.DataFrame(data, index=dates)
        
        # Test saving to database
        with get_db() as db:
            repo = ProcessedDataRepository(db)
            success = repo.save_processed_data('test_1h', df)
            
            if success:
                logger.info("Successfully saved processed data to database")
            else:
                logger.error("Failed to save processed data to database")
                return False
            
            # Test retrieving from database
            retrieved_df = repo.get_processed_data('test_1h', limit=10)
            
            if retrieved_df is not None and len(retrieved_df) > 0:
                logger.info(f"Successfully retrieved processed data from database: {len(retrieved_df)} rows")
            else:
                logger.error("Failed to retrieve processed data from database")
                return False
        
        return True
    except Exception as e:
        logger.error(f"Processed data repository test failed: {str(e)}")
        return False

def test_pattern_repository():
    """Test pattern repository."""
    logger.info("Testing pattern repository...")
    try:
        # Create sample data
        import numpy as np
        
        timeframe = 'test_1h'
        metadata = {
            "extraction_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "window_size": 5,
            "grid_rows": 10,
            "grid_cols": 10,
            "representatives": {
                "0": {"timestamp": "2023-01-01T00:00:00", "index": 0, "count": 10},
                "1": {"timestamp": "2023-01-01T05:00:00", "index": 5, "count": 8}
            }
        }
        
        windows = [np.random.rand(5, 4) for _ in range(20)]
        timestamps = [datetime(2023, 1, 1, i) for i in range(20)]
        cluster_labels = np.array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
        distance_matrix = np.random.rand(20, 20)
        
        # Test saving to database
        with get_db() as db:
            repo = PatternRepository(db)
            result = repo.save_patterns(
                timeframe=timeframe,
                metadata=metadata,
                windows=windows,
                timestamps=timestamps,
                cluster_labels=cluster_labels,
                distance_matrix=distance_matrix
            )
            
            if result:
                logger.info("Successfully saved patterns to database")
            else:
                logger.error("Failed to save patterns to database")
                return False
            
            # Test retrieving from database
            pattern_data = repo.get_pattern_details(timeframe)
            
            if pattern_data is not None:
                logger.info(f"Successfully retrieved pattern data from database: {pattern_data['n_patterns']} patterns")
            else:
                logger.error("Failed to retrieve pattern data from database")
                return False
        
        return True
    except Exception as e:
        logger.error(f"Pattern repository test failed: {str(e)}")
        return False

def test_analysis_repository():
    """Test analysis repository."""
    logger.info("Testing analysis repository...")
    try:
        # Create sample data
        timeframe = 'test_1h'
        analysis_data = {
            "timeframe": timeframe,
            "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "lookahead_periods": 10,
            "significance_threshold": 0.05,
            "min_occurrences": 5,
            "n_patterns": 20,
            "n_clusters": 2,
            "profitable_clusters": 1,
            "significant_clusters": 1,
            "profitability": {
                "avg_return": 0.02,
                "win_rate": 0.55,
                "profit_factor": 1.2
            },
            "statistical_significance": {
                "0": {"p_value": 0.03, "t_statistic": 2.1, "significant": True},
                "1": {"p_value": 0.08, "t_statistic": 1.7, "significant": False}
            },
            "cluster_returns": {
                "0": {"count": 10, "avg_return": 0.03, "median_return": 0.025, "std_return": 0.01, "win_rate": 0.6, "profit_factor": 1.5},
                "1": {"count": 10, "avg_return": -0.01, "median_return": -0.015, "std_return": 0.02, "win_rate": 0.4, "profit_factor": 0.8}
            }
        }
        
        # Test saving to database
        with get_db() as db:
            repo = AnalysisRepository(db)
            result = repo.save_analysis(timeframe, analysis_data)
            
            if result:
                logger.info("Successfully saved analysis to database")
            else:
                logger.error("Failed to save analysis to database")
                return False
            
            # Test retrieving from database
            retrieved_data = repo.get_analysis_details(timeframe)
            
            if retrieved_data is not None:
                logger.info(f"Successfully retrieved analysis data from database: {retrieved_data['n_clusters']} clusters")
            else:
                logger.error("Failed to retrieve analysis data from database")
                return False
        
        return True
    except Exception as e:
        logger.error(f"Analysis repository test failed: {str(e)}")
        return False

def test_migration():
    """Test data migration."""
    logger.info("Testing data migration...")
    try:
        # Initialize migration utility
        migration = DataMigration()
        
        # Test database initialization
        db_init = migration.initialize_database()
        if not db_init:
            logger.error("Database initialization failed")
            return False
        
        logger.info("Database initialized successfully")
        
        # Test migration of sample data
        # Note: This is just a basic test, actual migration would be done with real data
        
        # Create sample processed data file
        processed_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "processed")
        os.makedirs(processed_dir, exist_ok=True)
        
        dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
        data = {
            'open': [100 + i * 0.1 for i in range(100)],
            'high': [101 + i * 0.1 for i in range(100)],
            'low': [99 + i * 0.1 for i in range(100)],
            'close': [100.5 + i * 0.1 for i in range(100)],
            'volume': [1000 + i * 10 for i in range(100)]
        }
        df = pd.DataFrame(data, index=dates)
        
        file_path = os.path.join(processed_dir, "XAU_1d_processed.csv")
        df.to_csv(file_path)
        
        # Test migration of processed data
        processed_results = migration.migrate_processed_data(['1d'])
        
        if processed_results and processed_results.get('1d', False):
            logger.info("Successfully migrated processed data")
        else:
            logger.error("Failed to migrate processed data")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Migration test failed: {str(e)}")
        return False

def run_all_tests():
    """Run all database integration tests."""
    logger.info("Running all database integration tests...")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Database Initialization", test_database_initialization),
        ("System Settings", test_system_settings),
        ("Processed Data Repository", test_processed_data_repository),
        ("Pattern Repository", test_pattern_repository),
        ("Analysis Repository", test_analysis_repository),
        ("Data Migration", test_migration)
    ]
    
    results = {}
    all_passed = True
    
    for name, test_func in tests:
        logger.info(f"Running test: {name}")
        try:
            result = test_func()
            results[name] = result
            if not result:
                all_passed = False
                logger.error(f"Test failed: {name}")
            else:
                logger.info(f"Test passed: {name}")
        except Exception as e:
            results[name] = False
            all_passed = False
            logger.error(f"Test error: {name} - {str(e)}")
    
    logger.info("All tests completed")
    logger.info(f"Overall result: {'PASSED' if all_passed else 'FAILED'}")
    
    for name, result in results.items():
        logger.info(f"  {name}: {'PASSED' if result else 'FAILED'}")
    
    return all_passed

if __name__ == "__main__":
    run_all_tests()
