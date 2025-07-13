from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PatternAnalysisRequest(BaseModel):
    timeframe: str = Field(..., description="Timeframe to analyze patterns for (e.g., '1h', '4h', '1d')")
    lookahead_periods: int = Field(default=10, description="Number of periods to look ahead for returns calculation")
    significance_threshold: float = Field(default=0.05, description="P-value threshold for statistical significance")
    min_occurrences: int = Field(default=5, description="Minimum number of pattern occurrences required for analysis")

class PatternAnalysisResponse(BaseModel):
    timeframe: str
    analysis_date: str
    n_patterns: int
    n_clusters: int
    profitable_clusters: int
    significant_clusters: int
    status: str

class AnalysisDetailsResponse(BaseModel):
    timeframe: str
    analysis_date: str
    lookahead_periods: int
    significance_threshold: float
    profitability: Dict[str, Any]
    statistical_significance: Dict[str, Any]
    cluster_returns: Dict[str, Any]
    status: str

class AnalysisListResponse(BaseModel):
    analyses: List[Dict[str, Any]]
