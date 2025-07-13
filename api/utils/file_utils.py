from fastapi import APIRouter, HTTPException
import os
import json
import uuid
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('utils')

def create_directories(base_dir):
    """
    Create necessary directories for the application.
    
    Args:
        base_dir (str): Base directory path
    """
    dirs = [
        os.path.join(base_dir, "data"),
        os.path.join(base_dir, "data", "processed"),
        os.path.join(base_dir, "data", "patterns", "data"),
        os.path.join(base_dir, "data", "patterns", "visualizations"),
        os.path.join(base_dir, "data", "analysis", "data"),
        os.path.join(base_dir, "data", "analysis", "visualizations")
    ]
    
    for directory in dirs:
        os.makedirs(directory, exist_ok=True)
        
def generate_task_id(prefix):
    """
    Generate a unique task ID.
    
    Args:
        prefix (str): Prefix for the task ID
        
    Returns:
        str: Unique task ID
    """
    return f"{prefix}_{uuid.uuid4().hex[:8]}"
    
def save_json(data, file_path):
    """
    Save data to a JSON file.
    
    Args:
        data (dict): Data to save
        file_path (str): Path to save the file
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving JSON: {str(e)}")
        return False
        
def load_json(file_path):
    """
    Load data from a JSON file.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        dict: Loaded data or None if error
    """
    try:
        if not os.path.exists(file_path):
            return None
            
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading JSON: {str(e)}")
        return None
