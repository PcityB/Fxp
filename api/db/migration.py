"""
Data migration utility for transferring data from file-based storage to PostgreSQL database.
"""

import os
import json
import pickle
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional, Tuple

from db.database import get_db, engine, Base
from db.models import (
    ForexData, ProcessedData, Pattern, PatternInstance, 
    PatternPerformance, Visualization, SystemSetting
)
from db.repository import ProcessedDataRepository, PatternRepository, AnalysisRepository

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data_migration')

class DataMigration:
    """
    Utility class for migrating data from file-based storage to PostgreSQL database.
    """
    
    def __init__(self, base_dir: str = None):
        """
        Initialize the data migration utility.
        
        Args:
            base_dir: Base directory for file-based storage
        """
        if base_dir:
            self.base_dir = base_dir
        else:
            self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
        self.data_dir = os.path.join(self.base_dir, "data")
        self.processed_dir = os.path.join(self.data_dir, "processed")
        self.patterns_dir = os.path.join(self.data_dir, "patterns")
        self.patterns_data_dir = os.path.join(self.patterns_dir, "data")
        self.patterns_viz_dir = os.path.join(self.patterns_dir, "visualizations")
        self.analysis_dir = os.path.join(self.data_dir, "analysis")
        self.analysis_data_dir = os.path.join(self.analysis_dir, "data")
        self.analysis_viz_dir = os.path.join(self.analysis_dir, "visualizations")
    
    def initialize_database(self) -> bool:
        """
        Initialize the database schema.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Create all tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
            
            # Initialize system settings
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
            
            # Check if TimescaleDB extension is enabled
            with engine.connect() as conn:
                result = conn.execute("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'").fetchone()
                if not result:
                    logger.warning("TimescaleDB extension is not enabled in the database")
                    logger.warning("Time series functionality will be limited")
                    logger.warning("To enable TimescaleDB, run: CREATE EXTENSION IF NOT EXISTS timescaledb;")
                else:
                    logger.info("TimescaleDB extension is enabled")
                    
                    # Create hypertables
                    conn.execute("SELECT create_hypertable('forex_data', 'timestamp', if_not_exists => TRUE);")
                    conn.execute("SELECT create_hypertable('processed_data', 'timestamp', if_not_exists => TRUE);")
                    logger.info("Hypertables created successfully")
            
            return True
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return False
    
    def migrate_processed_data(self, timeframes: List[str] = None) -> Dict[str, bool]:
        """
        Migrate processed data from files to database.
        
        Args:
            timeframes: List of timeframes to migrate, or None to migrate all
            
        Returns:
            Dict mapping timeframes to migration success status
        """
        results = {}
        
        try:
            # Get list of processed data files
            if not os.path.exists(self.processed_dir):
                logger.warning(f"Processed data directory not found: {self.processed_dir}")
                return results
                
            files = [f for f in os.listdir(self.processed_dir) if f.endswith("_processed.csv")]
            
            if not files:
                logger.warning("No processed data files found")
                return results
                
            # Extract timeframes from filenames
            available_timeframes = [f.split("_")[1] for f in files]
            
            # Filter timeframes if specified
            if timeframes:
                timeframes_to_migrate = [tf for tf in timeframes if tf in available_timeframes]
            else:
                timeframes_to_migrate = available_timeframes
                
            if not timeframes_to_migrate:
                logger.warning("No matching timeframes found for migration")
                return results
                
            # Migrate each timeframe
            for timeframe in timeframes_to_migrate:
                try:
                    logger.info(f"Migrating processed data for timeframe: {timeframe}")
                    
                    # Load data from file
                    file_path = os.path.join(self.processed_dir, f"XAU_{timeframe}_processed.csv")
                    if not os.path.exists(file_path):
                        logger.warning(f"Processed data file not found: {file_path}")
                        results[timeframe] = False
                        continue
                        
                    df = pd.read_csv(file_path, index_col=0)
                    
                    # Save to database using repository
                    with get_db() as db:
                        repo = ProcessedDataRepository(db)
                        success = repo.save_processed_data(timeframe, df)
                        
                    results[timeframe] = success
                    logger.info(f"Processed data migration for {timeframe}: {'Success' if success else 'Failed'}")
                    
                except Exception as e:
                    logger.error(f"Error migrating processed data for {timeframe}: {str(e)}")
                    results[timeframe] = False
            
            return results
        except Exception as e:
            logger.error(f"Error in processed data migration: {str(e)}")
            return results
    
    def migrate_patterns(self, timeframes: List[str] = None) -> Dict[str, bool]:
        """
        Migrate pattern data from files to database.
        
        Args:
            timeframes: List of timeframes to migrate, or None to migrate all
            
        Returns:
            Dict mapping timeframes to migration success status
        """
        results = {}
        
        try:
            # Get list of pattern data files
            if not os.path.exists(self.patterns_data_dir):
                logger.warning(f"Pattern data directory not found: {self.patterns_data_dir}")
                return results
                
            json_files = [f for f in os.listdir(self.patterns_data_dir) if f.endswith("_patterns.json")]
            
            if not json_files:
                logger.warning("No pattern data files found")
                return results
                
            # Extract timeframes from filenames
            available_timeframes = [f.split("_")[0] for f in json_files]
            
            # Filter timeframes if specified
            if timeframes:
                timeframes_to_migrate = [tf for tf in timeframes if tf in available_timeframes]
            else:
                timeframes_to_migrate = available_timeframes
                
            if not timeframes_to_migrate:
                logger.warning("No matching timeframes found for migration")
                return results
                
            # Migrate each timeframe
            for timeframe in timeframes_to_migrate:
                try:
                    logger.info(f"Migrating pattern data for timeframe: {timeframe}")
                    
                    # Load metadata from JSON
                    json_path = os.path.join(self.patterns_data_dir, f"{timeframe}_patterns.json")
                    if not os.path.exists(json_path):
                        logger.warning(f"Pattern metadata file not found: {json_path}")
                        results[timeframe] = False
                        continue
                        
                    with open(json_path, 'r') as f:
                        metadata = json.load(f)
                    
                    # Load full data from pickle
                    pickle_path = os.path.join(self.patterns_data_dir, f"{timeframe}_full_patterns.pkl")
                    if not os.path.exists(pickle_path):
                        logger.warning(f"Pattern full data file not found: {pickle_path}")
                        results[timeframe] = False
                        continue
                        
                    with open(pickle_path, 'rb') as f:
                        full_data = pickle.load(f)
                    
                    # Extract components
                    windows = full_data.get("windows", [])
                    timestamps = full_data.get("timestamps", [])
                    cluster_labels = full_data.get("cluster_labels", [])
                    distance_matrix = full_data.get("distance_matrix", [])
                    
                    # Save to database using repository
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
                        
                    success = result is not None
                    results[timeframe] = success
                    logger.info(f"Pattern data migration for {timeframe}: {'Success' if success else 'Failed'}")
                    
                except Exception as e:
                    logger.error(f"Error migrating pattern data for {timeframe}: {str(e)}")
                    results[timeframe] = False
            
            return results
        except Exception as e:
            logger.error(f"Error in pattern data migration: {str(e)}")
            return results
    
    def migrate_analysis(self, timeframes: List[str] = None) -> Dict[str, bool]:
        """
        Migrate analysis data from files to database.
        
        Args:
            timeframes: List of timeframes to migrate, or None to migrate all
            
        Returns:
            Dict mapping timeframes to migration success status
        """
        results = {}
        
        try:
            # Get list of analysis data files
            if not os.path.exists(self.analysis_data_dir):
                logger.warning(f"Analysis data directory not found: {self.analysis_data_dir}")
                return results
                
            json_files = [f for f in os.listdir(self.analysis_data_dir) if f.endswith("_analysis.json")]
            
            if not json_files:
                logger.warning("No analysis data files found")
                return results
                
            # Extract timeframes from filenames
            available_timeframes = [f.split("_")[0] for f in json_files]
            
            # Filter timeframes if specified
            if timeframes:
                timeframes_to_migrate = [tf for tf in timeframes if tf in available_timeframes]
            else:
                timeframes_to_migrate = available_timeframes
                
            if not timeframes_to_migrate:
                logger.warning("No matching timeframes found for migration")
                return results
                
            # Migrate each timeframe
            for timeframe in timeframes_to_migrate:
                try:
                    logger.info(f"Migrating analysis data for timeframe: {timeframe}")
                    
                    # Load analysis data from JSON
                    json_path = os.path.join(self.analysis_data_dir, f"{timeframe}_analysis.json")
                    if not os.path.exists(json_path):
                        logger.warning(f"Analysis data file not found: {json_path}")
                        results[timeframe] = False
                        continue
                        
                    with open(json_path, 'r') as f:
                        analysis_data = json.load(f)
                    
                    # Save to database using repository
                    with get_db() as db:
                        repo = AnalysisRepository(db)
                        result = repo.save_analysis(timeframe, analysis_data)
                        
                    success = result is not None
                    results[timeframe] = success
                    logger.info(f"Analysis data migration for {timeframe}: {'Success' if success else 'Failed'}")
                    
                except Exception as e:
                    logger.error(f"Error migrating analysis data for {timeframe}: {str(e)}")
                    results[timeframe] = False
            
            return results
        except Exception as e:
            logger.error(f"Error in analysis data migration: {str(e)}")
            return results
    
    def migrate_visualizations(self) -> Dict[str, int]:
        """
        Migrate visualization metadata to database.
        
        Returns:
            Dict with counts of migrated visualizations by type
        """
        results = {
            "pattern": 0,
            "analysis": 0,
            "total": 0
        }
        
        try:
            # Migrate pattern visualizations
            if os.path.exists(self.patterns_viz_dir):
                # Get all timeframe subdirectories
                timeframe_dirs = [d for d in os.listdir(self.patterns_viz_dir) 
                                 if os.path.isdir(os.path.join(self.patterns_viz_dir, d))]
                
                for timeframe in timeframe_dirs:
                    timeframe_dir = os.path.join(self.patterns_viz_dir, timeframe)
                    viz_files = [f for f in os.listdir(timeframe_dir) if f.endswith(".png")]
                    
                    for viz_file in viz_files:
                        try:
                            # Extract cluster ID and visualization type
                            if "cluster_" in viz_file:
                                parts = viz_file.split("_")
                                cluster_id = int(parts[1])
                                viz_type = parts[2].split(".")[0]  # "pattern" or "candlestick"
                                
                                # Get pattern ID for this cluster
                                with get_db() as db:
                                    pattern = db.query(Pattern).filter(
                                        Pattern.timeframe == timeframe,
                                        Pattern.cluster_id == cluster_id
                                    ).first()
                                    
                                    if pattern:
                                        # Create visualization record
                                        viz = Visualization(
                                            related_entity_type="pattern",
                                            related_entity_id=pattern.pattern_id,
                                            visualization_type=f"pattern_{viz_type}",
                                            file_path=os.path.join(timeframe_dir, viz_file),
                                            metadata={
                                                "timeframe": timeframe,
                                                "cluster_id": cluster_id
                                            }
                                        )
                                        
                                        db.add(viz)
                                        db.commit()
                                        
                                        results["pattern"] += 1
                                        results["total"] += 1
                        except Exception as e:
                            logger.error(f"Error migrating pattern visualization {viz_file}: {str(e)}")
            
            # Migrate analysis visualizations
            if os.path.exists(self.analysis_viz_dir):
                # Get all timeframe subdirectories
                timeframe_dirs = [d for d in os.listdir(self.analysis_viz_dir) 
                                 if os.path.isdir(os.path.join(self.analysis_viz_dir, d))]
                
                for timeframe in timeframe_dirs:
                    timeframe_dir = os.path.join(self.analysis_viz_dir, timeframe)
                    viz_files = [f for f in os.listdir(timeframe_dir) if f.endswith(".png")]
                    
                    for viz_file in viz_files:
                        try:
                            # Extract chart type
                            if "_chart.png" in viz_file:
                                chart_type = viz_file.split("_")[0]  # "profitability", "significance", etc.
                                
                                with get_db() as db:
                                    # Create visualization record
                                    viz = Visualization(
                                        related_entity_type="analysis",
                                        related_entity_id=uuid.uuid4(),  # Generate a unique ID
                                        visualization_type=f"analysis_{chart_type}",
                                        file_path=os.path.join(timeframe_dir, viz_file),
                                        metadata={
                                            "timeframe": timeframe,
                                            "chart_type": chart_type
                                        }
                                    )
                                    
                                    db.add(viz)
                                    db.commit()
                                    
                                    results["analysis"] += 1
                                    results["total"] += 1
                        except Exception as e:
                            logger.error(f"Error migrating analysis visualization {viz_file}: {str(e)}")
            
            logger.info(f"Visualization migration complete: {results['total']} total visualizations migrated")
            return results
        except Exception as e:
            logger.error(f"Error in visualization migration: {str(e)}")
            return results
    
    def migrate_all(self, timeframes: List[str] = None) -> Dict[str, Any]:
        """
        Migrate all data from files to database.
        
        Args:
            timeframes: List of timeframes to migrate, or None to migrate all
            
        Returns:
            Dict with migration results
        """
        results = {
            "database_initialized": False,
            "processed_data": {},
            "patterns": {},
            "analysis": {},
            "visualizations": {},
            "success": False
        }
        
        try:
            # Initialize database
            db_init = self.initialize_database()
            results["database_initialized"] = db_init
            
            if not db_init:
                logger.error("Database initialization failed, aborting migration")
                return results
            
            # Migrate processed data
            processed_results = self.migrate_processed_data(timeframes)
            results["processed_data"] = processed_results
            
            # Migrate patterns
            pattern_results = self.migrate_patterns(timeframes)
            results["patterns"] = pattern_results
            
            # Migrate analysis
            analysis_results = self.migrate_analysis(timeframes)
            results["analysis"] = analysis_results
            
            # Migrate visualizations
            viz_results = self.migrate_visualizations()
            results["visualizations"] = viz_results
            
            # Check overall success
            processed_success = all(processed_results.values()) if processed_results else True
            pattern_success = all(pattern_results.values()) if pattern_results else True
            analysis_success = all(analysis_results.values()) if analysis_results else True
            viz_success = viz_results["total"] > 0
            
            results["success"] = db_init and processed_success and pattern_success and analysis_success
            
            logger.info(f"Data migration complete: {'Success' if results['success'] else 'Partial success or failure'}")
            return results
        except Exception as e:
            logger.error(f"Error in data migration: {str(e)}")
            results["error"] = str(e)
            return results

# Command-line interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate forex pattern data from files to PostgreSQL database")
    parser.add_argument("--timeframes", nargs="*", help="Timeframes to migrate (e.g., 1h 4h 1d)")
    parser.add_argument("--type", choices=["all", "processed", "patterns", "analysis", "visualizations"],
                       default="all", help="Type of data to migrate")
    
    args = parser.parse_args()
    
    migration = DataMigration()
    
    if args.type == "all":
        results = migration.migrate_all(args.timeframes)
        print(f"Migration complete: {'Success' if results['success'] else 'Partial success or failure'}")
    elif args.type == "processed":
        results = migration.migrate_processed_data(args.timeframes)
        print(f"Processed data migration complete: {results}")
    elif args.type == "patterns":
        results = migration.migrate_patterns(args.timeframes)
        print(f"Pattern data migration complete: {results}")
    elif args.type == "analysis":
        results = migration.migrate_analysis(args.timeframes)
        print(f"Analysis data migration complete: {results}")
    elif args.type == "visualizations":
        results = migration.migrate_visualizations()
        print(f"Visualization migration complete: {results}")
