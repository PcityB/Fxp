from src.pattern_extraction import PatternExtractor
import os
import pandas as pd
import json
import pickle
import uuid
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from db.repository import PatternRepository
from db.database import get_db
from routers.system import register_task, update_task_progress, complete_task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('pattern_service')

class PatternService:
    """
    Service class for pattern extraction operations.
    """
    
    def __init__(self):
        """
        Initialize the pattern service.
        """
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_dir = os.path.join(self.base_dir, "data")
        self.processed_dir = os.path.join(self.data_dir, "processed")
        self.patterns_dir = os.path.join(self.data_dir, "patterns")
        self.patterns_data_dir = os.path.join(self.patterns_dir, "data")
        self.patterns_viz_dir = os.path.join(self.patterns_dir, "visualizations")
        
        # Create directories if they don't exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)
        os.makedirs(self.patterns_data_dir, exist_ok=True)
        os.makedirs(self.patterns_viz_dir, exist_ok=True)
        
    def extract_patterns(self, timeframe, window_size=5, max_patterns=5000, grid_rows=10, grid_cols=10, n_clusters=None):
        """
        Extract patterns from processed forex data.
        
        Args:
            timeframe (str): Timeframe to extract patterns from
            window_size (int): Size of the sliding window for pattern extraction
            max_patterns (int): Maximum number of patterns to extract
            grid_rows (int): Number of rows in the Template Grid
            grid_cols (int): Number of columns in the Template Grid
            n_clusters (int): Number of clusters to form (if None, estimated automatically)
            
        Returns:
            dict: Pattern extraction result information
        """
        try:
            # Create task ID for tracking
            task_id = f"pattern_extraction_{timeframe}_{uuid.uuid4().hex[:8]}"
            register_task(task_id, f"Pattern extraction for {timeframe} timeframe")
            
            # Initialize pattern extractor
            extractor = PatternExtractor(self.processed_dir, self.patterns_dir)
            
            # Load data
            update_task_progress(task_id, 0.1, "loading_data")
            df = extractor.load_data(timeframe)
            if df is None:
                logger.error(f"Failed to load data for timeframe {timeframe}")
                complete_task(task_id, error=f"Failed to load data for timeframe {timeframe}")
                return None
                
            # Extract candlestick windows
            update_task_progress(task_id, 0.2, "extracting_windows")
            windows, timestamps = extractor.extract_candlestick_windows(
                timeframe=timeframe,
                window_size=window_size,
                stride=1,
                max_windows=max_patterns
            )
            
            if not windows or not timestamps:
                logger.error(f"Failed to extract windows for timeframe {timeframe}")
                complete_task(task_id, error=f"Failed to extract windows for timeframe {timeframe}")
                return None
                
            # Create template grids
            update_task_progress(task_id, 0.4, "creating_grids")
            grids, pics = extractor.create_template_grids(
                windows=windows,
                timestamps=timestamps,
                grid_rows=grid_rows,
                grid_cols=grid_cols
            )
            
            # Calculate distance matrix
            update_task_progress(task_id, 0.6, "calculating_distances")
            distance_matrix = extractor.calculate_dtw_distance_matrix(windows)
            
            # Cluster patterns
            update_task_progress(task_id, 0.8, "clustering_patterns")
            cluster_labels = extractor.cluster_patterns(
                distance_matrix=distance_matrix,
                n_clusters=n_clusters
            )
            
            # Extract representative patterns
            update_task_progress(task_id, 0.9, "extracting_representatives")
            representatives = extractor.extract_representative_patterns(
                windows=windows,
                timestamps=timestamps,
                cluster_labels=cluster_labels,
                distance_matrix=distance_matrix
            )
            
            # Visualize representative patterns
            extractor.visualize_representative_patterns(
                timeframe=timeframe,
                representatives=representatives,
                grid_rows=grid_rows,
                grid_cols=grid_cols
            )
            
            # Save results
            extraction_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Convert representatives to serializable format
            serializable_representatives = {}
            for cluster_id, rep in representatives.items():
                serializable_representatives[str(cluster_id)] = {
                    "timestamp": rep["timestamp"].isoformat() if hasattr(rep["timestamp"], "isoformat") else str(rep["timestamp"]),
                    "index": int(rep["index"]),
                    "count": int(rep["count"])
                }
            
            # Save metadata
            metadata = {
                "timeframe": timeframe,
                "extraction_date": extraction_date,
                "n_patterns": len(windows),
                "window_size": window_size,
                "grid_rows": grid_rows,
                "grid_cols": grid_cols,
                "cluster_labels": cluster_labels.tolist(),
                "representatives": serializable_representatives
            }
            
            # Save to database and/or file using repository
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
                
                if not result:
                    logger.error(f"Failed to save patterns for timeframe {timeframe}")
                    
                    # Fall back to file-only save
                    json_path = os.path.join(self.patterns_data_dir, f"{timeframe}_patterns.json")
                    with open(json_path, 'w') as f:
                        json.dump(metadata, f, indent=2)
                        
                    pickle_path = os.path.join(self.patterns_data_dir, f"{timeframe}_full_patterns.pkl")
                    full_data = {
                        "windows": windows,
                        "timestamps": timestamps,
                        "cluster_labels": cluster_labels,
                        "distance_matrix": distance_matrix
                    }
                    with open(pickle_path, 'wb') as f:
                        pickle.dump(full_data, f)
                    
                    result = {
                        "timeframe": timeframe,
                        "extraction_date": extraction_date,
                        "n_patterns": len(windows),
                        "window_size": window_size,
                        "n_clusters": len(set(cluster_labels.tolist())),
                        "json_path": json_path,
                        "pickle_path": pickle_path
                    }
            
            # Complete task
            complete_task(task_id, result=result)
            return result
            
        except Exception as e:
            logger.error(f"Error extracting patterns: {str(e)}")
            if 'task_id' in locals():
                complete_task(task_id, error=str(e))
            return None
            
    def get_pattern_details(self, timeframe):
        """
        Get details of extracted patterns for a timeframe.
        
        Args:
            timeframe (str): Timeframe to get pattern details for
            
        Returns:
            dict: Pattern details
        """
        try:
            # Try to get pattern details from database first
            with get_db() as db:
                repo = PatternRepository(db)
                pattern_data = repo.get_pattern_details(timeframe)
                
                if pattern_data is not None:
                    return pattern_data
                    
            # If database retrieval failed, try file-based approach as fallback
            file_path = os.path.join(self.patterns_data_dir, f"{timeframe}_patterns.json")
            
            if not os.path.exists(file_path):
                logger.error(f"Pattern data file not found: {file_path}")
                return None
                
            with open(file_path, 'r') as f:
                pattern_data = json.load(f)
                
            return pattern_data
        except Exception as e:
            logger.error(f"Error getting pattern details: {str(e)}")
            return None
