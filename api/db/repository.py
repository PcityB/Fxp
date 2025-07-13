"""
Repository pattern implementation for database operations.
Provides an abstraction layer between database models and service layer.
"""

import os
import json
import pandas as pd
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from datetime import datetime
import uuid

from db.models import (
    ForexData, ProcessedData, Pattern, PatternInstance, 
    PatternPerformance, Visualization, SystemSetting
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('repository')

class BaseRepository:
    """Base repository with common operations."""
    
    def __init__(self, db: Session):
        self.db = db
        
    def get_storage_mode(self) -> Dict[str, str]:
        """Get current storage mode configuration."""
        try:
            setting = self.db.query(SystemSetting).filter(
                SystemSetting.setting_key == 'storage_mode'
            ).first()
            
            if setting:
                return setting.setting_value
            else:
                # Default to database with file fallback if not configured
                return {"primary": "database", "fallback": "file"}
        except Exception as e:
            logger.error(f"Error getting storage mode: {str(e)}")
            # Default to database with file fallback on error
            return {"primary": "database", "fallback": "file"}
    
    def get_file_paths(self) -> Dict[str, str]:
        """Get file storage paths for fallback mode."""
        try:
            setting = self.db.query(SystemSetting).filter(
                SystemSetting.setting_key == 'file_storage_paths'
            ).first()
            
            if setting:
                return setting.setting_value
            else:
                # Default paths if not configured
                return {
                    "processed_data": "data/processed",
                    "patterns": "data/patterns",
                    "analysis": "data/analysis"
                }
        except Exception as e:
            logger.error(f"Error getting file paths: {str(e)}")
            # Default paths on error
            return {
                "processed_data": "data/processed",
                "patterns": "data/patterns",
                "analysis": "data/analysis"
            }

class ProcessedDataRepository(BaseRepository):
    """Repository for processed forex data operations."""
    
    def save_processed_data(self, timeframe: str, data: pd.DataFrame) -> bool:
        """
        Save processed data to database.
        
        Args:
            timeframe: Timeframe of the data
            data: DataFrame containing processed data
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get storage mode
            storage_mode = self.get_storage_mode()
            
            if storage_mode["primary"] == "database":
                # Convert DataFrame to list of dictionaries
                records = data.reset_index().to_dict('records')
                
                # Bulk insert records
                processed_data_objects = []
                for record in records:
                    # Extract basic OHLCV data
                    obj = ProcessedData(
                        timestamp=record.get('timestamp') or record.get('date'),
                        symbol="XAU",  # Default to XAU/USD
                        timeframe=timeframe,
                        open=record.get('open'),
                        high=record.get('high'),
                        low=record.get('low'),
                        close=record.get('close'),
                        volume=record.get('volume', 0)
                    )
                    
                    # Add technical indicators if present
                    for indicator in ['sma_5', 'sma_10', 'sma_20', 'ema_5', 'ema_10', 'ema_20',
                                     'rsi_14', 'macd', 'macd_signal', 'macd_hist',
                                     'bollinger_upper', 'bollinger_middle', 'bollinger_lower',
                                     'atr_14']:
                        if indicator in record:
                            setattr(obj, indicator, record[indicator])
                    
                    # Add normalized features if present
                    for norm_feature in ['norm_open', 'norm_high', 'norm_low', 'norm_close', 'norm_volume']:
                        if norm_feature in record:
                            setattr(obj, norm_feature, record[norm_feature])
                    
                    # Store any additional features as JSON
                    feature_data = {}
                    for key, value in record.items():
                        if key not in ['timestamp', 'date', 'open', 'high', 'low', 'close', 'volume',
                                      'sma_5', 'sma_10', 'sma_20', 'ema_5', 'ema_10', 'ema_20',
                                      'rsi_14', 'macd', 'macd_signal', 'macd_hist',
                                      'bollinger_upper', 'bollinger_middle', 'bollinger_lower',
                                      'atr_14', 'norm_open', 'norm_high', 'norm_low', 'norm_close', 'norm_volume']:
                            feature_data[key] = value
                    
                    if feature_data:
                        obj.feature_data = feature_data
                    
                    processed_data_objects.append(obj)
                
                # Bulk insert in chunks to avoid memory issues
                chunk_size = 1000
                for i in range(0, len(processed_data_objects), chunk_size):
                    chunk = processed_data_objects[i:i+chunk_size]
                    self.db.bulk_save_objects(chunk)
                
                self.db.commit()
                logger.info(f"Saved {len(processed_data_objects)} processed data records to database for {timeframe}")
                
                # If fallback is enabled, also save to file
                if storage_mode["fallback"] == "file":
                    self._save_to_file(timeframe, data)
                
                return True
            
            elif storage_mode["primary"] == "file":
                # Save to file as primary storage
                return self._save_to_file(timeframe, data)
            
            else:
                logger.error(f"Unknown storage mode: {storage_mode['primary']}")
                return False
                
        except Exception as e:
            logger.error(f"Error saving processed data: {str(e)}")
            self.db.rollback()
            
            # Try fallback if enabled
            if storage_mode.get("fallback") == "file":
                logger.info("Attempting file fallback for processed data")
                return self._save_to_file(timeframe, data)
            
            return False
    
    def _save_to_file(self, timeframe: str, data: pd.DataFrame) -> bool:
        """Save processed data to file as fallback."""
        try:
            # Get file paths
            file_paths = self.get_file_paths()
            processed_dir = file_paths.get("processed_data", "data/processed")
            
            # Create directory if it doesn't exist
            os.makedirs(processed_dir, exist_ok=True)
            
            # Save to CSV
            file_path = os.path.join(processed_dir, f"XAU_{timeframe}_processed.csv")
            data.to_csv(file_path)
            logger.info(f"Saved processed data to file: {file_path}")
            
            return True
        except Exception as e:
            logger.error(f"Error saving processed data to file: {str(e)}")
            return False
    
    def get_processed_data(self, timeframe: str, limit: int = 100) -> Optional[pd.DataFrame]:
        """
        Get processed data for a specific timeframe.
        
        Args:
            timeframe: Timeframe to get data for
            limit: Limit the number of rows returned
            
        Returns:
            DataFrame containing processed data or None if not found
        """
        try:
            # Get storage mode
            storage_mode = self.get_storage_mode()
            
            if storage_mode["primary"] == "database":
                # Query from database
                query = self.db.query(ProcessedData).filter(
                    ProcessedData.timeframe == timeframe,
                    ProcessedData.symbol == "XAU"
                ).order_by(ProcessedData.timestamp.desc())
                
                if limit > 0:
                    query = query.limit(limit)
                
                results = query.all()
                
                if not results:
                    logger.warning(f"No processed data found in database for {timeframe}")
                    
                    # Try fallback if enabled
                    if storage_mode.get("fallback") == "file":
                        logger.info("Attempting file fallback for getting processed data")
                        return self._get_from_file(timeframe, limit)
                    
                    return None
                
                # Convert to DataFrame
                data = []
                for record in results:
                    row = {
                        'timestamp': record.timestamp,
                        'open': record.open,
                        'high': record.high,
                        'low': record.low,
                        'close': record.close,
                        'volume': record.volume
                    }
                    
                    # Add technical indicators if present
                    for indicator in ['sma_5', 'sma_10', 'sma_20', 'ema_5', 'ema_10', 'ema_20',
                                     'rsi_14', 'macd', 'macd_signal', 'macd_hist',
                                     'bollinger_upper', 'bollinger_middle', 'bollinger_lower',
                                     'atr_14']:
                        value = getattr(record, indicator, None)
                        if value is not None:
                            row[indicator] = value
                    
                    # Add normalized features if present
                    for norm_feature in ['norm_open', 'norm_high', 'norm_low', 'norm_close', 'norm_volume']:
                        value = getattr(record, norm_feature, None)
                        if value is not None:
                            row[norm_feature] = value
                    
                    # Add any additional features from JSON
                    if record.feature_data:
                        for key, value in record.feature_data.items():
                            row[key] = value
                    
                    data.append(row)
                
                df = pd.DataFrame(data)
                df.set_index('timestamp', inplace=True)
                
                return df
            
            elif storage_mode["primary"] == "file":
                # Get from file as primary storage
                return self._get_from_file(timeframe, limit)
            
            else:
                logger.error(f"Unknown storage mode: {storage_mode['primary']}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting processed data: {str(e)}")
            
            # Try fallback if enabled
            if storage_mode.get("fallback") == "file":
                logger.info("Attempting file fallback for getting processed data")
                return self._get_from_file(timeframe, limit)
            
            return None
    
    def _get_from_file(self, timeframe: str, limit: int = 100) -> Optional[pd.DataFrame]:
        """Get processed data from file as fallback."""
        try:
            # Get file paths
            file_paths = self.get_file_paths()
            processed_dir = file_paths.get("processed_data", "data/processed")
            
            # Check if file exists
            file_path = os.path.join(processed_dir, f"XAU_{timeframe}_processed.csv")
            if not os.path.exists(file_path):
                logger.error(f"Processed data file not found: {file_path}")
                return None
            
            # Load from CSV
            df = pd.read_csv(file_path, index_col=0)
            
            if limit > 0:
                df = df.head(limit)
            
            return df
        except Exception as e:
            logger.error(f"Error getting processed data from file: {str(e)}")
            return None

class PatternRepository(BaseRepository):
    """Repository for pattern operations."""
    
    def save_patterns(self, timeframe: str, metadata: Dict, windows: List, 
                     timestamps: List, cluster_labels: List, distance_matrix: List) -> Optional[Dict]:
        """
        Save extracted patterns to database.
        
        Args:
            timeframe: Timeframe of the patterns
            metadata: Pattern metadata
            windows: List of pattern windows
            timestamps: List of timestamps
            cluster_labels: List of cluster labels
            distance_matrix: Distance matrix
            
        Returns:
            Dict with result information or None if failed
        """
        try:
            # Get storage mode
            storage_mode = self.get_storage_mode()
            
            if storage_mode["primary"] == "database":
                # Extract metadata
                extraction_date = metadata.get("extraction_date", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                window_size = metadata.get("window_size", 5)
                representatives = metadata.get("representatives", {})
                
                # Get unique clusters
                unique_clusters = set(cluster_labels)
                
                # Create pattern records for each cluster
                patterns = {}
                for cluster_id in unique_clusters:
                    # Count occurrences
                    count = sum(1 for label in cluster_labels if label == cluster_id)
                    
                    # Get representative info
                    rep_info = representatives.get(str(cluster_id), {})
                    
                    # Create pattern record
                    pattern = Pattern(
                        name=f"{timeframe}_pattern_{cluster_id}",
                        description=f"Automatically discovered pattern in {timeframe} timeframe, cluster {cluster_id}",
                        template_grid_dimensions=f"{metadata.get('grid_rows', 10)}x{metadata.get('grid_cols', 10)}",
                        discovery_timestamp=datetime.fromisoformat(extraction_date) if isinstance(extraction_date, str) else extraction_date,
                        discovery_method="template_grid_clustering",
                        timeframe=timeframe,
                        window_size=window_size,
                        cluster_id=int(cluster_id),
                        n_occurrences=count,
                        visualization_path=f"data/patterns/visualizations/{timeframe}/cluster_{cluster_id}_pattern.png",
                        pattern_data={
                            "extraction_date": extraction_date,
                            "representative_index": rep_info.get("index", 0),
                            "representative_timestamp": rep_info.get("timestamp", ""),
                        }
                    )
                    
                    self.db.add(pattern)
                    self.db.flush()  # Flush to get pattern_id
                    patterns[cluster_id] = pattern
                
                # Create pattern instances
                instances = []
                for i, (window, timestamp, cluster_id) in enumerate(zip(windows, timestamps, cluster_labels)):
                    # Get associated pattern
                    pattern = patterns.get(cluster_id)
                    if not pattern:
                        continue
                    
                    # Calculate end timestamp (assuming timestamp is start)
                    start_timestamp = timestamp
                    if isinstance(start_timestamp, str):
                        start_timestamp = datetime.fromisoformat(start_timestamp)
                    
                    # For simplicity, we're setting end_timestamp to start + window_size periods
                    # In a real system, you'd calculate this based on the actual data
                    end_timestamp = start_timestamp  # This should be properly calculated
                    
                    # Create instance
                    instance = PatternInstance(
                        pattern_id=pattern.pattern_id,
                        symbol="XAU",
                        timeframe=timeframe,
                        start_timestamp=start_timestamp,
                        end_timestamp=end_timestamp,
                        match_score=1.0,  # Default score for discovered patterns
                        window_data={
                            "window": window.tolist() if hasattr(window, "tolist") else window,
                            "index": i
                        }
                    )
                    
                    instances.append(instance)
                
                # Bulk insert instances in chunks
                chunk_size = 1000
                for i in range(0, len(instances), chunk_size):
                    chunk = instances[i:i+chunk_size]
                    self.db.bulk_save_objects(chunk)
                
                # Create visualizations
                for cluster_id, pattern in patterns.items():
                    visualization = Visualization(
                        related_entity_type="pattern",
                        related_entity_id=pattern.pattern_id,
                        visualization_type="pattern_template",
                        file_path=f"data/patterns/visualizations/{timeframe}/cluster_{cluster_id}_pattern.png",
                        metadata={
                            "timeframe": timeframe,
                            "cluster_id": int(cluster_id)
                        }
                    )
                    self.db.add(visualization)
                    
                    # Add candlestick visualization if available
                    candlestick_path = f"data/patterns/visualizations/{timeframe}/cluster_{cluster_id}_candlestick.png"
                    if os.path.exists(candlestick_path):
                        candlestick_viz = Visualization(
                            related_entity_type="pattern",
                            related_entity_id=pattern.pattern_id,
                            visualization_type="pattern_candlestick",
                            file_path=candlestick_path,
                            metadata={
                                "timeframe": timeframe,
                                "cluster_id": int(cluster_id)
                            }
                        )
                        self.db.add(candlestick_viz)
                
                self.db.commit()
                logger.info(f"Saved {len(patterns)} patterns and {len(instances)} instances to database for {timeframe}")
                
                # If fallback is enabled, also save to file
                if storage_mode["fallback"] == "file":
                    self._save_to_file(timeframe, metadata, windows, timestamps, cluster_labels, distance_matrix)
                
                # Return result information
                return {
                    "timeframe": timeframe,
                    "extraction_date": extraction_date,
                    "n_patterns": len(windows),
                    "window_size": window_size,
                    "n_clusters": len(patterns),
                    "database_path": f"database://{timeframe}_patterns"
                }
            
            elif storage_mode["primary"] == "file":
                # Save to file as primary storage
                return self._save_to_file(timeframe, metadata, windows, timestamps, cluster_labels, distance_matrix)
            
            else:
                logger.error(f"Unknown storage mode: {storage_mode['primary']}")
                return None
                
        except Exception as e:
            logger.error(f"Error saving patterns: {str(e)}")
            self.db.rollback()
            
            # Try fallback if enabled
            if storage_mode.get("fallback") == "file":
                logger.info("Attempting file fallback for saving patterns")
                return self._save_to_file(timeframe, metadata, windows, timestamps, cluster_labels, distance_matrix)
            
            return None
    
    def _save_to_file(self, timeframe: str, metadata: Dict, windows: List, 
                     timestamps: List, cluster_labels: List, distance_matrix: List) -> Optional[Dict]:
        """Save patterns to file as fallback."""
        try:
            # Get file paths
            file_paths = self.get_file_paths()
            patterns_dir = file_paths.get("patterns", "data/patterns")
            patterns_data_dir = os.path.join(patterns_dir, "data")
            
            # Create directories if they don't exist
            os.makedirs(patterns_data_dir, exist_ok=True)
            
            # Save metadata to JSON
            json_path = os.path.join(patterns_data_dir, f"{timeframe}_patterns.json")
            with open(json_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Save full data to pickle
            import pickle
            full_data = {
                "windows": windows,
                "timestamps": timestamps,
                "cluster_labels": cluster_labels,
                "distance_matrix": distance_matrix
            }
            
            pickle_path = os.path.join(patterns_data_dir, f"{timeframe}_full_patterns.pkl")
            with open(pickle_path, 'wb') as f:
                pickle.dump(full_data, f)
            
            logger.info(f"Saved patterns to files: {json_path} and {pickle_path}")
            
            # Return result information
            return {
                "timeframe": timeframe,
                "extraction_date": metadata.get("extraction_date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                "n_patterns": len(windows),
                "window_size": metadata.get("window_size", 5),
                "n_clusters": len(set(cluster_labels)),
                "json_path": json_path,
                "pickle_path": pickle_path
            }
        except Exception as e:
            logger.error(f"Error saving patterns to file: {str(e)}")
            return None
    
    def get_pattern_details(self, timeframe: str) -> Optional[Dict]:
        """
        Get details of extracted patterns for a timeframe.
        
        Args:
            timeframe: Timeframe to get pattern details for
            
        Returns:
            Dict with pattern details or None if not found
        """
        try:
            # Get storage mode
            storage_mode = self.get_storage_mode()
            
            if storage_mode["primary"] == "database":
                # Query patterns from database
                patterns = self.db.query(Pattern).filter(
                    Pattern.timeframe == timeframe
                ).all()
                
                if not patterns:
                    logger.warning(f"No patterns found in database for {timeframe}")
                    
                    # Try fallback if enabled
                    if storage_mode.get("fallback") == "file":
                        logger.info("Attempting file fallback for getting pattern details")
                        return self._get_from_file(timeframe)
                    
                    return None
                
                # Get a sample pattern to extract common metadata
                sample_pattern = patterns[0]
                
                # Count instances
                instance_count = self.db.query(func.count(PatternInstance.instance_id)).filter(
                    PatternInstance.pattern_id.in_([p.pattern_id for p in patterns])
                ).scalar()
                
                # Build representatives dictionary
                representatives = {}
                for pattern in patterns:
                    # Get representative instance
                    rep_instance = self.db.query(PatternInstance).filter(
                        PatternInstance.pattern_id == pattern.pattern_id
                    ).order_by(PatternInstance.match_score.desc()).first()
                    
                    if rep_instance:
                        representatives[str(pattern.cluster_id)] = {
                            "timestamp": rep_instance.start_timestamp.isoformat(),
                            "index": rep_instance.window_data.get("index", 0) if rep_instance.window_data else 0,
                            "count": pattern.n_occurrences
                        }
                
                # Build result
                result = {
                    "timeframe": timeframe,
                    "extraction_date": sample_pattern.discovery_timestamp.isoformat(),
                    "n_patterns": instance_count,
                    "window_size": sample_pattern.window_size,
                    "cluster_labels": [p.cluster_id for p in patterns],
                    "representatives": representatives
                }
                
                return result
            
            elif storage_mode["primary"] == "file":
                # Get from file as primary storage
                return self._get_from_file(timeframe)
            
            else:
                logger.error(f"Unknown storage mode: {storage_mode['primary']}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting pattern details: {str(e)}")
            
            # Try fallback if enabled
            if storage_mode.get("fallback") == "file":
                logger.info("Attempting file fallback for getting pattern details")
                return self._get_from_file(timeframe)
            
            return None
    
    def _get_from_file(self, timeframe: str) -> Optional[Dict]:
        """Get pattern details from file as fallback."""
        try:
            # Get file paths
            file_paths = self.get_file_paths()
            patterns_dir = file_paths.get("patterns", "data/patterns")
            patterns_data_dir = os.path.join(patterns_dir, "data")
            
            # Check if file exists
            file_path = os.path.join(patterns_data_dir, f"{timeframe}_patterns.json")
            if not os.path.exists(file_path):
                logger.error(f"Pattern data file not found: {file_path}")
                return None
            
            # Load from JSON
            with open(file_path, 'r') as f:
                pattern_data = json.load(f)
            
            return pattern_data
        except Exception as e:
            logger.error(f"Error getting pattern details from file: {str(e)}")
            return None

class AnalysisRepository(BaseRepository):
    """Repository for pattern analysis operations."""
    
    def save_analysis(self, timeframe: str, analysis_data: Dict) -> Optional[Dict]:
        """
        Save pattern analysis results to database.
        
        Args:
            timeframe: Timeframe of the analysis
            analysis_data: Analysis data and results
            
        Returns:
            Dict with result information or None if failed
        """
        try:
            # Get storage mode
            storage_mode = self.get_storage_mode()
            
            if storage_mode["primary"] == "database":
                # Extract analysis metadata
                analysis_date = analysis_data.get("analysis_date", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                lookahead_periods = analysis_data.get("lookahead_periods", 10)
                significance_threshold = analysis_data.get("significance_threshold", 0.05)
                min_occurrences = analysis_data.get("min_occurrences", 5)
                
                # Get patterns for this timeframe
                patterns = self.db.query(Pattern).filter(
                    Pattern.timeframe == timeframe
                ).all()
                
                if not patterns:
                    logger.warning(f"No patterns found in database for {timeframe}")
                    
                    # Try fallback if enabled
                    if storage_mode.get("fallback") == "file":
                        logger.info("Attempting file fallback for saving analysis")
                        return self._save_to_file(timeframe, analysis_data)
                    
                    return None
                
                # Create pattern performance records
                performances = []
                for pattern in patterns:
                    # Get cluster returns data
                    cluster_returns = analysis_data.get("cluster_returns", {}).get(str(pattern.cluster_id), {})
                    if not cluster_returns:
                        continue
                    
                    # Get statistical significance data
                    stat_sig = analysis_data.get("statistical_significance", {}).get(str(pattern.cluster_id), {})
                    
                    # Create performance record
                    performance = PatternPerformance(
                        pattern_id=pattern.pattern_id,
                        symbol="XAU",
                        timeframe=timeframe,
                        test_period_start=datetime.fromisoformat(analysis_date) if isinstance(analysis_date, str) else analysis_date,
                        test_period_end=datetime.fromisoformat(analysis_date) if isinstance(analysis_date, str) else analysis_date,
                        lookahead_periods=lookahead_periods,
                        profit_factor=cluster_returns.get("profit_factor", 0),
                        win_rate=cluster_returns.get("win_rate", 0),
                        mean_return=cluster_returns.get("avg_return", 0),
                        median_return=cluster_returns.get("median_return", 0),
                        std_return=cluster_returns.get("std_return", 0),
                        t_statistic=stat_sig.get("t_statistic", 0),
                        p_value=stat_sig.get("p_value", 1),
                        is_significant=stat_sig.get("significant", False),
                        significance_threshold=significance_threshold,
                        total_trades=cluster_returns.get("count", 0),
                        test_parameters={
                            "lookahead_periods": lookahead_periods,
                            "significance_threshold": significance_threshold,
                            "min_occurrences": min_occurrences
                        },
                        visualization_path=f"data/analysis/visualizations/{timeframe}/cluster_{pattern.cluster_id}_performance.png"
                    )
                    
                    performances.append(performance)
                
                # Bulk insert performances
                self.db.bulk_save_objects(performances)
                
                # Create visualizations for analysis charts
                chart_types = ["profitability", "significance", "distribution"]
                for chart_type in chart_types:
                    visualization = Visualization(
                        related_entity_type="analysis",
                        related_entity_id=uuid.uuid4(),  # Generate a unique ID for the analysis
                        visualization_type=f"analysis_{chart_type}",
                        file_path=f"data/analysis/visualizations/{timeframe}/{chart_type}_chart.png",
                        metadata={
                            "timeframe": timeframe,
                            "chart_type": chart_type
                        }
                    )
                    self.db.add(visualization)
                
                self.db.commit()
                logger.info(f"Saved {len(performances)} performance records to database for {timeframe}")
                
                # If fallback is enabled, also save to file
                if storage_mode["fallback"] == "file":
                    self._save_to_file(timeframe, analysis_data)
                
                # Return result information
                return {
                    "timeframe": timeframe,
                    "analysis_date": analysis_date,
                    "n_patterns": analysis_data.get("n_patterns", 0),
                    "n_clusters": analysis_data.get("n_clusters", 0),
                    "profitable_clusters": analysis_data.get("profitable_clusters", 0),
                    "significant_clusters": analysis_data.get("significant_clusters", 0),
                    "database_path": f"database://{timeframe}_analysis"
                }
            
            elif storage_mode["primary"] == "file":
                # Save to file as primary storage
                return self._save_to_file(timeframe, analysis_data)
            
            else:
                logger.error(f"Unknown storage mode: {storage_mode['primary']}")
                return None
                
        except Exception as e:
            logger.error(f"Error saving analysis: {str(e)}")
            self.db.rollback()
            
            # Try fallback if enabled
            if storage_mode.get("fallback") == "file":
                logger.info("Attempting file fallback for saving analysis")
                return self._save_to_file(timeframe, analysis_data)
            
            return None
    
    def _save_to_file(self, timeframe: str, analysis_data: Dict) -> Optional[Dict]:
        """Save analysis to file as fallback."""
        try:
            # Get file paths
            file_paths = self.get_file_paths()
            analysis_dir = file_paths.get("analysis", "data/analysis")
            analysis_data_dir = os.path.join(analysis_dir, "data")
            
            # Create directories if they don't exist
            os.makedirs(analysis_data_dir, exist_ok=True)
            
            # Save to JSON
            json_path = os.path.join(analysis_data_dir, f"{timeframe}_analysis.json")
            with open(json_path, 'w') as f:
                json.dump(analysis_data, f, indent=2)
            
            logger.info(f"Saved analysis to file: {json_path}")
            
            # Return result information
            return {
                "timeframe": timeframe,
                "analysis_date": analysis_data.get("analysis_date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                "n_patterns": analysis_data.get("n_patterns", 0),
                "n_clusters": analysis_data.get("n_clusters", 0),
                "profitable_clusters": analysis_data.get("profitable_clusters", 0),
                "significant_clusters": analysis_data.get("significant_clusters", 0),
                "json_path": json_path
            }
        except Exception as e:
            logger.error(f"Error saving analysis to file: {str(e)}")
            return None
    
    def get_analysis_details(self, timeframe: str) -> Optional[Dict]:
        """
        Get detailed analysis results for a timeframe.
        
        Args:
            timeframe: Timeframe to get analysis details for
            
        Returns:
            Dict with analysis details or None if not found
        """
        try:
            # Get storage mode
            storage_mode = self.get_storage_mode()
            
            if storage_mode["primary"] == "database":
                # Get patterns for this timeframe
                patterns = self.db.query(Pattern).filter(
                    Pattern.timeframe == timeframe
                ).all()
                
                if not patterns:
                    logger.warning(f"No patterns found in database for {timeframe}")
                    
                    # Try fallback if enabled
                    if storage_mode.get("fallback") == "file":
                        logger.info("Attempting file fallback for getting analysis details")
                        return self._get_from_file(timeframe)
                    
                    return None
                
                # Get performance records for these patterns
                performances = self.db.query(PatternPerformance).filter(
                    PatternPerformance.pattern_id.in_([p.pattern_id for p in patterns])
                ).all()
                
                if not performances:
                    logger.warning(f"No performance records found in database for {timeframe}")
                    
                    # Try fallback if enabled
                    if storage_mode.get("fallback") == "file":
                        logger.info("Attempting file fallback for getting analysis details")
                        return self._get_from_file(timeframe)
                    
                    return None
                
                # Get a sample performance to extract common metadata
                sample_perf = performances[0]
                
                # Build statistical significance data
                statistical_significance = {}
                for perf in performances:
                    pattern = next((p for p in patterns if p.pattern_id == perf.pattern_id), None)
                    if not pattern:
                        continue
                    
                    statistical_significance[str(pattern.cluster_id)] = {
                        "p_value": float(perf.p_value),
                        "t_statistic": float(perf.t_statistic),
                        "significant": perf.is_significant
                    }
                
                # Build cluster returns data
                cluster_returns = {}
                for perf in performances:
                    pattern = next((p for p in patterns if p.pattern_id == perf.pattern_id), None)
                    if not pattern:
                        continue
                    
                    if perf.total_trades >= sample_perf.test_parameters.get("min_occurrences", 5):
                        cluster_returns[str(pattern.cluster_id)] = {
                            "count": int(perf.total_trades),
                            "avg_return": float(perf.mean_return),
                            "median_return": float(perf.median_return),
                            "std_return": float(perf.std_return),
                            "win_rate": float(perf.win_rate),
                            "profit_factor": float(perf.profit_factor)
                        }
                
                # Calculate overall profitability metrics
                all_returns = [perf.mean_return for perf in performances]
                all_win_rates = [perf.win_rate for perf in performances]
                
                overall_profitability = {
                    "avg_return": float(sum(all_returns) / len(all_returns)) if all_returns else 0,
                    "win_rate": float(sum(all_win_rates) / len(all_win_rates)) if all_win_rates else 0,
                    "profit_factor": float(sum(r for r in all_returns if r > 0) / abs(sum(r for r in all_returns if r < 0))) if sum(r for r in all_returns if r < 0) != 0 else 0
                }
                
                # Count profitable and significant clusters
                profitable_clusters = sum(1 for perf in performances if perf.mean_return > 0)
                significant_clusters = sum(1 for perf in performances if perf.is_significant)
                
                # Build result
                result = {
                    "timeframe": timeframe,
                    "analysis_date": sample_perf.test_period_start.isoformat(),
                    "lookahead_periods": sample_perf.lookahead_periods,
                    "significance_threshold": sample_perf.significance_threshold,
                    "min_occurrences": sample_perf.test_parameters.get("min_occurrences", 5),
                    "n_patterns": sum(p.n_occurrences for p in patterns),
                    "n_clusters": len(patterns),
                    "profitable_clusters": profitable_clusters,
                    "significant_clusters": significant_clusters,
                    "profitability": overall_profitability,
                    "statistical_significance": statistical_significance,
                    "cluster_returns": cluster_returns
                }
                
                return result
            
            elif storage_mode["primary"] == "file":
                # Get from file as primary storage
                return self._get_from_file(timeframe)
            
            else:
                logger.error(f"Unknown storage mode: {storage_mode['primary']}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting analysis details: {str(e)}")
            
            # Try fallback if enabled
            if storage_mode.get("fallback") == "file":
                logger.info("Attempting file fallback for getting analysis details")
                return self._get_from_file(timeframe)
            
            return None
    
    def _get_from_file(self, timeframe: str) -> Optional[Dict]:
        """Get analysis details from file as fallback."""
        try:
            # Get file paths
            file_paths = self.get_file_paths()
            analysis_dir = file_paths.get("analysis", "data/analysis")
            analysis_data_dir = os.path.join(analysis_dir, "data")
            
            # Check if file exists
            file_path = os.path.join(analysis_data_dir, f"{timeframe}_analysis.json")
            if not os.path.exists(file_path):
                logger.error(f"Analysis data file not found: {file_path}")
                return None
            
            # Load from JSON
            with open(file_path, 'r') as f:
                analysis_data = json.load(f)
            
            return analysis_data
        except Exception as e:
            logger.error(f"Error getting analysis details from file: {str(e)}")
            return None
