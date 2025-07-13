from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse, Response
from typing import List, Optional
import os
import pandas as pd
import json
from datetime import datetime
import io

from models.analysis import PatternAnalysisRequest, PatternAnalysisResponse, AnalysisDetailsResponse, AnalysisListResponse
from services.analysis_service import AnalysisService
from db.database import get_db
from db.repository import AnalysisRepository
from db.models import Pattern, PatternPerformance, Visualization

router = APIRouter()
analysis_service = AnalysisService()

@router.post("/analyze", response_model=PatternAnalysisResponse)
async def analyze_patterns(request: PatternAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Analyze extracted patterns for profitability and statistical significance.
    
    - **timeframe**: Timeframe to analyze patterns for
    - **lookahead_periods**: Number of periods to look ahead for returns calculation
    - **significance_threshold**: P-value threshold for statistical significance
    - **min_occurrences**: Minimum number of pattern occurrences required for analysis
    """
    try:
        # Analyze patterns using service (which now uses database repository)
        result = analysis_service.analyze_patterns(
            timeframe=request.timeframe,
            lookahead_periods=request.lookahead_periods,
            significance_threshold=request.significance_threshold,
            min_occurrences=request.min_occurrences
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Error analyzing patterns")
            
        return PatternAnalysisResponse(
            timeframe=request.timeframe,
            analysis_date=result["analysis_date"],
            n_patterns=result["n_patterns"],
            n_clusters=result["n_clusters"],
            profitable_clusters=result["profitable_clusters"],
            significant_clusters=result["significant_clusters"],
            status="success"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing patterns: {str(e)}")

@router.get("/list", response_model=AnalysisListResponse)
async def list_analyses():
    """
    List all available analysis results.
    """
    try:
        # Get analyses from database
        with get_db() as db:
            # Query unique timeframes with performance data
            analyses_query = db.query(
                PatternPerformance.timeframe,
                PatternPerformance.test_period_start,
                PatternPerformance.lookahead_periods,
                PatternPerformance.significance_threshold
            ).distinct().all()
            
            analyses = []
            
            for timeframe, test_period_start, lookahead_periods, significance_threshold in analyses_query:
                # Get cluster count for this timeframe
                cluster_count = db.query(db.func.count(db.func.distinct(Pattern.cluster_id))).filter(
                    Pattern.timeframe == timeframe
                ).scalar() or 0
                
                # Get profitable clusters count
                profitable_clusters = db.query(db.func.count(PatternPerformance.performance_id)).filter(
                    PatternPerformance.timeframe == timeframe,
                    PatternPerformance.mean_return > 0
                ).scalar() or 0
                
                # Get significant clusters count
                significant_clusters = db.query(db.func.count(PatternPerformance.performance_id)).filter(
                    PatternPerformance.timeframe == timeframe,
                    PatternPerformance.is_significant == True
                ).scalar() or 0
                
                analyses.append({
                    "timeframe": timeframe,
                    "analysis_date": test_period_start.isoformat() if test_period_start else "",
                    "lookahead_periods": int(lookahead_periods),
                    "n_clusters": int(cluster_count),
                    "profitable_clusters": int(profitable_clusters),
                    "significant_clusters": int(significant_clusters)
                })
            
            # If no analyses found in database, try file-based fallback
            if not analyses:
                analysis_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "analysis", "data")
                if os.path.exists(analysis_dir):
                    analysis_files = [f for f in os.listdir(analysis_dir) if f.endswith("_analysis.json")]
                    
                    for file in analysis_files:
                        timeframe = file.replace("_analysis.json", "")
                        file_path = os.path.join(analysis_dir, file)
                        
                        try:
                            # Read analysis metadata
                            with open(file_path, 'r') as f:
                                analysis_data = json.load(f)
                                
                            analyses.append({
                                "timeframe": timeframe,
                                "analysis_date": analysis_data.get("analysis_date", ""),
                                "lookahead_periods": analysis_data.get("lookahead_periods", 0),
                                "n_clusters": len(analysis_data.get("cluster_returns", {})),
                                "profitable_clusters": sum(1 for cluster in analysis_data.get("cluster_returns", {}).values() 
                                                         if cluster.get("avg_return", 0) > 0),
                                "significant_clusters": sum(1 for cluster in analysis_data.get("statistical_significance", {}).values() 
                                                          if cluster.get("significant", False)),
                                "file": file
                            })
                        except Exception as e:
                            analyses.append({
                                "timeframe": timeframe,
                                "file": file,
                                "error": str(e)
                            })
                
        return AnalysisListResponse(analyses=analyses)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing analyses: {str(e)}")

@router.get("/{timeframe}", response_model=AnalysisDetailsResponse)
async def get_analysis_details(timeframe: str):
    """
    Get detailed analysis results for a timeframe.
    
    - **timeframe**: Timeframe to get analysis details for
    """
    try:
        # Get analysis details from service (which now uses database repository)
        analysis_data = analysis_service.get_analysis_details(timeframe)
        
        if not analysis_data:
            raise HTTPException(status_code=404, detail=f"Analysis data for timeframe {timeframe} not found")
            
        return AnalysisDetailsResponse(
            timeframe=timeframe,
            analysis_date=analysis_data.get("analysis_date", ""),
            lookahead_periods=analysis_data.get("lookahead_periods", 0),
            significance_threshold=analysis_data.get("significance_threshold", 0.05),
            profitability=analysis_data.get("profitability", {}),
            statistical_significance=analysis_data.get("statistical_significance", {}),
            cluster_returns=analysis_data.get("cluster_returns", {}),
            status="success"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analysis details: {str(e)}")

@router.get("/{timeframe}/visualize")
async def get_analysis_visualization(timeframe: str, chart_type: str = Query("profitability", description="Type of visualization to return")):
    """
    Get visualization of analysis results.
    
    - **timeframe**: Timeframe of the analysis
    - **chart_type**: Type of visualization to return (profitability, significance, distribution)
    """
    try:
        # Try to get visualization from database
        with get_db() as db:
            # Get visualization for this analysis
            viz = db.query(Visualization).filter(
                Visualization.related_entity_type == "analysis",
                Visualization.visualization_type == f"analysis_{chart_type}",
                Visualization.meta_info["timeframe"].astext == timeframe  # Updated from metadata to meta_info
            ).first()
            
            if viz and os.path.exists(viz.file_path):
                return FileResponse(
                    path=viz.file_path,
                    media_type="image/png"
                )
        
        # Fallback to file-based approach
        viz_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "analysis", "visualizations", timeframe)
        
        if not os.path.exists(viz_dir):
            raise HTTPException(status_code=404, detail=f"Visualizations for timeframe {timeframe} not found")
            
        # Check for requested visualization
        valid_types = ["profitability", "significance", "distribution"]
        if chart_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid chart type. Must be one of: {', '.join(valid_types)}")
            
        viz_file = os.path.join(viz_dir, f"{chart_type}_chart.png")
        if os.path.exists(viz_file):
            return FileResponse(
                path=viz_file,
                media_type="image/png"
            )
            
        raise HTTPException(status_code=404, detail=f"{chart_type.capitalize()} visualization for {timeframe} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analysis visualization: {str(e)}")

@router.get("/{timeframe}/download")
async def download_analysis(timeframe: str):
    """
    Download analysis data for a specific timeframe.
    
    - **timeframe**: Timeframe to download analysis for
    """
    try:
        # Get analysis details from service (which now uses database repository)
        analysis_data = analysis_service.get_analysis_details(timeframe)
        
        if not analysis_data:
            raise HTTPException(status_code=404, detail=f"Analysis data for timeframe {timeframe} not found")
        
        # Convert to JSON and return as file
        json_data = json.dumps(analysis_data, indent=2)
        
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={timeframe}_analysis.json"}
        )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to file-based approach
        try:
            analysis_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "analysis", "data")
            file_path = os.path.join(analysis_dir, f"{timeframe}_analysis.json")
            
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"Analysis data for timeframe {timeframe} not found")
                
            return FileResponse(
                path=file_path,
                filename=f"{timeframe}_analysis.json",
                media_type="application/json"
            )
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Error downloading analysis: {str(e)}, Fallback error: {str(fallback_error)}")
