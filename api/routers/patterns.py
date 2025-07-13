from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse, Response
from typing import List, Optional
import os
import pandas as pd
import json
from datetime import datetime
import pickle
import io

from models.patterns import PatternExtractionRequest, PatternExtractionResponse, PatternDetailsResponse, PatternListResponse
from services.pattern_service import PatternService
from db.database import get_db
from db.repository import PatternRepository
from db.models import Pattern, Visualization

router = APIRouter()
pattern_service = PatternService()

@router.post("/extract", response_model=PatternExtractionResponse)
async def extract_patterns(request: PatternExtractionRequest, background_tasks: BackgroundTasks):
    """
    Extract patterns from processed forex data.
    
    - **timeframe**: Timeframe to extract patterns from
    - **window_size**: Size of the sliding window for pattern extraction
    - **max_patterns**: Maximum number of patterns to extract
    - **grid_rows**: Number of rows in the Template Grid
    - **grid_cols**: Number of columns in the Template Grid
    - **n_clusters**: Number of clusters to form (if None, estimated automatically)
    """
    try:
        # Extract patterns using service (which now uses database repository)
        result = pattern_service.extract_patterns(
            timeframe=request.timeframe,
            window_size=request.window_size,
            max_patterns=request.max_patterns,
            grid_rows=request.grid_rows,
            grid_cols=request.grid_cols,
            n_clusters=request.n_clusters
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Error extracting patterns")
            
        return PatternExtractionResponse(
            timeframe=request.timeframe,
            extraction_date=result["extraction_date"],
            n_patterns=result["n_patterns"],
            window_size=result["window_size"],
            n_clusters=result["n_clusters"],
            status="success"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting patterns: {str(e)}")

@router.get("/list", response_model=PatternListResponse)
async def list_patterns():
    """
    List all extracted pattern sets.
    """
    try:
        # Get patterns from database
        with get_db() as db:
            # Query unique timeframes and their pattern counts
            patterns_query = db.query(
                Pattern.timeframe,
                Pattern.discovery_timestamp,
                Pattern.window_size,
                db.func.count(Pattern.pattern_id).label('pattern_count')
            ).group_by(
                Pattern.timeframe,
                Pattern.discovery_timestamp,
                Pattern.window_size
            ).all()
            
            patterns = []
            
            for timeframe, discovery_timestamp, window_size, pattern_count in patterns_query:
                # Get cluster count for this timeframe
                cluster_count = db.query(db.func.count(db.func.distinct(Pattern.cluster_id))).filter(
                    Pattern.timeframe == timeframe
                ).scalar()
                
                # Get total instance count
                instance_count = db.query(db.func.sum(Pattern.n_occurrences)).filter(
                    Pattern.timeframe == timeframe
                ).scalar() or 0
                
                patterns.append({
                    "timeframe": timeframe,
                    "extraction_date": discovery_timestamp.isoformat() if discovery_timestamp else "",
                    "n_patterns": int(instance_count),
                    "window_size": int(window_size),
                    "n_clusters": int(cluster_count),
                })
            
            # If no patterns found in database, try file-based fallback
            if not patterns:
                patterns_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "patterns", "data")
                if os.path.exists(patterns_dir):
                    pattern_files = [f for f in os.listdir(patterns_dir) if f.endswith("_patterns.json")]
                    
                    for file in pattern_files:
                        timeframe = file.replace("_patterns.json", "")
                        file_path = os.path.join(patterns_dir, file)
                        
                        try:
                            # Read pattern metadata
                            with open(file_path, 'r') as f:
                                pattern_data = json.load(f)
                                
                            patterns.append({
                                "timeframe": timeframe,
                                "extraction_date": pattern_data.get("extraction_date", ""),
                                "n_patterns": pattern_data.get("n_patterns", 0),
                                "window_size": pattern_data.get("window_size", 0),
                                "n_clusters": len(pattern_data.get("cluster_labels", [])),
                                "file": file
                            })
                        except Exception as e:
                            patterns.append({
                                "timeframe": timeframe,
                                "file": file,
                                "error": str(e)
                            })
                
        return PatternListResponse(patterns=patterns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing patterns: {str(e)}")

@router.get("/{timeframe}", response_model=PatternDetailsResponse)
async def get_pattern_details(timeframe: str):
    """
    Get details of extracted patterns for a timeframe.
    
    - **timeframe**: Timeframe to get pattern details for
    """
    try:
        # Get pattern details from service (which now uses database repository)
        pattern_data = pattern_service.get_pattern_details(timeframe)
        
        if not pattern_data:
            raise HTTPException(status_code=404, detail=f"Pattern data for timeframe {timeframe} not found")
            
        return PatternDetailsResponse(
            timeframe=timeframe,
            extraction_date=pattern_data.get("extraction_date", ""),
            n_patterns=pattern_data.get("n_patterns", 0),
            window_size=pattern_data.get("window_size", 0),
            cluster_labels=pattern_data.get("cluster_labels", []),
            representatives=pattern_data.get("representatives", {}),
            status="success"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting pattern details: {str(e)}")

@router.get("/{timeframe}/visualize/{cluster_id}")
async def get_pattern_visualization(timeframe: str, cluster_id: int):
    """
    Get visualization of a specific pattern cluster.
    
    - **timeframe**: Timeframe of the patterns
    - **cluster_id**: Cluster ID to visualize
    """
    try:
        # Try to get visualization from database
        with get_db() as db:
            # First, get the pattern ID for this cluster
            pattern = db.query(Pattern).filter(
                Pattern.timeframe == timeframe,
                Pattern.cluster_id == cluster_id
            ).first()
            
            if pattern:
                # Get visualization for this pattern
                viz = db.query(Visualization).filter(
                    Visualization.related_entity_type == "pattern",
                    Visualization.related_entity_id == pattern.pattern_id
                ).first()
                
                if viz and os.path.exists(viz.file_path):
                    return FileResponse(
                        path=viz.file_path,
                        media_type="image/png"
                    )
        
        # Fallback to file-based approach
        viz_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "patterns", "visualizations", timeframe)
        
        if not os.path.exists(viz_dir):
            raise HTTPException(status_code=404, detail=f"Visualizations for timeframe {timeframe} not found")
            
        # Check for grid visualization
        grid_file = os.path.join(viz_dir, f"cluster_{cluster_id}_pattern.png")
        if os.path.exists(grid_file):
            return FileResponse(
                path=grid_file,
                media_type="image/png"
            )
            
        # Check for candlestick visualization
        candle_file = os.path.join(viz_dir, f"cluster_{cluster_id}_candlestick.png")
        if os.path.exists(candle_file):
            return FileResponse(
                path=candle_file,
                media_type="image/png"
            )
            
        raise HTTPException(status_code=404, detail=f"Visualization for cluster {cluster_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting pattern visualization: {str(e)}")

@router.get("/{timeframe}/download")
async def download_patterns(timeframe: str):
    """
    Download pattern data for a specific timeframe.
    
    - **timeframe**: Timeframe to download patterns for
    """
    try:
        # Get pattern details from service (which now uses database repository)
        pattern_data = pattern_service.get_pattern_details(timeframe)
        
        if not pattern_data:
            raise HTTPException(status_code=404, detail=f"Pattern data for timeframe {timeframe} not found")
        
        # Convert to JSON and return as file
        json_data = json.dumps(pattern_data, indent=2)
        
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={timeframe}_patterns.json"}
        )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to file-based approach
        try:
            patterns_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "patterns", "data")
            file_path = os.path.join(patterns_dir, f"{timeframe}_patterns.json")
            
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"Pattern data for timeframe {timeframe} not found")
                
            return FileResponse(
                path=file_path,
                filename=f"{timeframe}_patterns.json",
                media_type="application/json"
            )
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Error downloading patterns: {str(e)}, Fallback error: {str(fallback_error)}")
