from src.data_preprocessing import ForexDataPreprocessor
import os
import pandas as pd
import json
import uuid
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from db.repository import ProcessedDataRepository
from db.database import get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data_service')

class DataService:
    """
    Service class for data preprocessing operations.
    """
    
    def __init__(self):
        """
        Initialize the data service.
        """
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_dir = os.path.join(self.base_dir, "data")
        self.processed_dir = os.path.join(self.data_dir, "processed")
        
        # Create directories if they don't exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)
        
    def preprocess_data(self, timeframe, clean=True, engineer_features=True, normalize=True):
        """
        Preprocess forex data for a specific timeframe.
        
        Args:
            timeframe (str): Timeframe to preprocess
            clean (bool): Clean data by handling missing values and duplicates
            engineer_features (bool): Engineer additional features from the data
            normalize (bool): Normalize data using Min-Max scaling
            
        Returns:
            dict: Preprocessing result information
        """
        try:
            # Initialize preprocessor
            preprocessor = ForexDataPreprocessor(self.data_dir)
            
            # Load data
            raw_data = preprocessor.load_data(timeframe)
            if not raw_data or timeframe not in raw_data:
                logger.error(f"Failed to load data for timeframe {timeframe}")
                return None
                
            original_rows = len(raw_data[timeframe])
            
            # Process data
            if clean:
                preprocessor.clean_data(timeframe)
                
            if engineer_features:
                preprocessor.engineer_features(timeframe)
                
            if normalize:
                preprocessor.normalize_data(timeframe)
                
            # Get processed data
            processed_data = preprocessor.processed_data[timeframe]
            processed_rows = len(processed_data)
            features = processed_data.columns.tolist()
            
            # Save processed data to database and/or file
            with get_db() as db:
                repo = ProcessedDataRepository(db)
                save_result = repo.save_processed_data(timeframe, processed_data)
                
                if not save_result:
                    logger.error(f"Failed to save processed data for timeframe {timeframe}")
                    # Fall back to file-only save
                    saved_files = preprocessor.save_processed_data(self.processed_dir)
                    if timeframe not in saved_files:
                        logger.error(f"Failed to save processed data to file for timeframe {timeframe}")
                        return None
                    file_path = saved_files[timeframe]
                else:
                    # Use database path as reference
                    file_path = f"database://{timeframe}_processed"
            
            return {
                "timeframe": timeframe,
                "original_rows": original_rows,
                "processed_rows": processed_rows,
                "features": features,
                "file_path": file_path
            }
        except Exception as e:
            logger.error(f"Error preprocessing data: {str(e)}")
            return None
            
    def get_processed_data(self, timeframe, limit=100):
        """
        Get processed data for a specific timeframe.
        
        Args:
            timeframe (str): Timeframe to get data for
            limit (int): Limit the number of rows returned
            
        Returns:
            pandas.DataFrame: Processed data
        """
        try:
            # Try to get data from database first
            with get_db() as db:
                repo = ProcessedDataRepository(db)
                df = repo.get_processed_data(timeframe, limit)
                
                if df is not None:
                    return df
                    
            # If database retrieval failed, try file-based approach as fallback
            file_path = os.path.join(self.processed_dir, f"XAU_{timeframe}_processed.csv")
            
            if not os.path.exists(file_path):
                logger.error(f"Processed data file not found: {file_path}")
                return None
                
            df = pd.read_csv(file_path, index_col=0)
            
            if limit > 0:
                df = df.head(limit)
                
            return df
        except Exception as e:
            logger.error(f"Error getting processed data: {str(e)}")
            return None
