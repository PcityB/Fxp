from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import os
import pandas as pd
import json
from datetime import datetime
import shutil
import io

from models.data import DataUploadResponse, PreprocessRequest, PreprocessResponse, ProcessedDataResponse
from services.data_service import DataService
from db.database import get_db
from db.repository import ProcessedDataRepository

router = APIRouter()
data_service = DataService()

@router.post("/upload", response_model=DataUploadResponse)
async def upload_data(file: UploadFile = File(...), timeframe: str = Form(...)):
    """
    Upload forex data file for a specific timeframe.
    
    - **file**: CSV file containing forex data
    - **timeframe**: Timeframe of the data (e.g., '1h', '4h', '1d')
    """
    try:
        # Validate timeframe
        if not timeframe or not timeframe.strip():
            raise HTTPException(status_code=400, detail="Timeframe is required")
            
        # Create data directory if it doesn't exist
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        os.makedirs(data_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(data_dir, f"XAU_{timeframe}_data.csv")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Read file to get metadata
        df = pd.read_csv(file_path, delimiter=';', nrows=5)
        
        return DataUploadResponse(
            filename=f"XAU_{timeframe}_data.csv",
            timeframe=timeframe,
            rows=len(pd.read_csv(file_path, delimiter=';')),
            columns=df.columns.tolist(),
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/list")
async def list_data():
    """
    List all available forex data files.
    """
    try:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        if not os.path.exists(data_dir):
            return {"data": []}
            
        files = [f for f in os.listdir(data_dir) if f.startswith("XAU_") and f.endswith("_data.csv")]
        data_files = []
        
        for file in files:
            timeframe = file.replace("XAU_", "").replace("_data.csv", "")
            file_path = os.path.join(data_dir, file)
            
            try:
                # Get file metadata
                df = pd.read_csv(file_path, delimiter=';', nrows=5)
                data_files.append({
                    "filename": file,
                    "timeframe": timeframe,
                    "rows": len(pd.read_csv(file_path, delimiter=';')),
                    "columns": df.columns.tolist(),
                    "size_kb": os.path.getsize(file_path) / 1024
                })
            except Exception as e:
                data_files.append({
                    "filename": file,
                    "timeframe": timeframe,
                    "error": str(e)
                })
                
        return {"data": data_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing data files: {str(e)}")

@router.post("/preprocess", response_model=PreprocessResponse)
async def preprocess_data(request: PreprocessRequest, background_tasks: BackgroundTasks):
    """
    Preprocess forex data for a specific timeframe.
    
    - **timeframe**: Timeframe to preprocess
    - **clean**: Clean data by handling missing values and duplicates
    - **engineer_features**: Engineer additional features from the data
    - **normalize**: Normalize data using Min-Max scaling
    """
    try:
        # Validate timeframe
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        file_path = os.path.join(data_dir, f"XAU_{request.timeframe}_data.csv")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Data file for timeframe {request.timeframe} not found")
            
        # Initialize preprocessor
        result = data_service.preprocess_data(
            timeframe=request.timeframe,
            clean=request.clean,
            engineer_features=request.engineer_features,
            normalize=request.normalize
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Error preprocessing data")
            
        return PreprocessResponse(
            timeframe=request.timeframe,
            original_rows=result["original_rows"],
            processed_rows=result["processed_rows"],
            features=result["features"],
            status="success"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preprocessing data: {str(e)}")

@router.get("/processed/{timeframe}")
async def get_processed_data(timeframe: str, limit: int = Query(100, description="Limit the number of rows returned")):
    """
    Get processed data for a specific timeframe.
    
    - **timeframe**: Timeframe to get data for
    - **limit**: Limit the number of rows returned
    """
    try:
        # Get processed data from database or file using service
        df = data_service.get_processed_data(timeframe, limit)
        
        if df is None:
            raise HTTPException(status_code=404, detail=f"Processed data for timeframe {timeframe} not found")
            
        return ProcessedDataResponse(
            timeframe=timeframe,
            data=df.to_dict(orient="records"),
            shape=[df.shape[0], df.shape[1]],
            features=df.columns.tolist()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting processed data: {str(e)}")

@router.get("/download/{timeframe}")
async def download_processed_data(timeframe: str):
    """
    Download processed data for a specific timeframe.
    
    - **timeframe**: Timeframe to download data for
    """
    try:
        # Get processed data from database or file using service
        df = data_service.get_processed_data(timeframe, limit=0)  # No limit for download
        
        if df is None:
            raise HTTPException(status_code=404, detail=f"Processed data for timeframe {timeframe} not found")
        
        # Create in-memory file
        output = io.StringIO()
        df.to_csv(output)
        output.seek(0)
        
        # Return as file response
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=XAU_{timeframe}_processed.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to file-based approach if database retrieval fails
        try:
            processed_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "processed")
            file_path = os.path.join(processed_dir, f"XAU_{timeframe}_processed.csv")
            
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"Processed data for timeframe {timeframe} not found")
                
            return FileResponse(
                path=file_path,
                filename=f"XAU_{timeframe}_processed.csv",
                media_type="text/csv"
            )
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Error downloading processed data: {str(e)}, Fallback error: {str(fallback_error)}")

@router.get("/storage-mode")
async def get_storage_mode():
    """
    Get current storage mode configuration.
    """
    try:
        with get_db() as db:
            repo = ProcessedDataRepository(db)
            storage_mode = repo.get_storage_mode()
            return {"storage_mode": storage_mode}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting storage mode: {str(e)}")

@router.post("/storage-mode")
async def set_storage_mode(primary: str = Form(...), fallback: str = Form(...)):
    """
    Set storage mode configuration.
    
    - **primary**: Primary storage mode ('database' or 'file')
    - **fallback**: Fallback storage mode ('database', 'file', or 'none')
    """
    try:
        # Validate storage modes
        if primary not in ["database", "file"]:
            raise HTTPException(status_code=400, detail="Primary storage mode must be 'database' or 'file'")
            
        if fallback not in ["database", "file", "none"]:
            raise HTTPException(status_code=400, detail="Fallback storage mode must be 'database', 'file', or 'none'")
            
        # Update storage mode in database
        with get_db() as db:
            from db.models import SystemSetting
            
            setting = db.query(SystemSetting).filter(
                SystemSetting.setting_key == "storage_mode"
            ).first()
            
            if setting:
                setting.setting_value = {"primary": primary, "fallback": fallback}
                setting.updated_at = datetime.now()
            else:
                setting = SystemSetting(
                    setting_key="storage_mode",
                    setting_value={"primary": primary, "fallback": fallback},
                    description="Storage mode configuration"
                )
                db.add(setting)
                
            db.commit()
            
        return {"status": "success", "storage_mode": {"primary": primary, "fallback": fallback}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting storage mode: {str(e)}")
