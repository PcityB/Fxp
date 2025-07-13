from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PatternExtractionRequest(BaseModel):
    timeframe: str = Field(..., description="Timeframe to extract patterns from (e.g., '1h', '4h', '1d')")
    window_size: int = Field(default=5, description="Size of the sliding window for pattern extraction")
    max_patterns: Optional[int] = Field(default=5000, description="Maximum number of patterns to extract")
    grid_rows: int = Field(default=10, description="Number of rows in the Template Grid")
    grid_cols: int = Field(default=10, description="Number of columns in the Template Grid")
    n_clusters: Optional[int] = Field(default=None, description="Number of clusters to form (if None, estimated automatically)")

class PatternExtractionResponse(BaseModel):
    timeframe: str
    extraction_date: str
    n_patterns: int
    window_size: int
    n_clusters: int
    status: str

class PatternDetailsResponse(BaseModel):
    timeframe: str
    extraction_date: str
    n_patterns: int
    window_size: int
    cluster_labels: List[int]
    representatives: Dict[str, Any]
    status: str

class PatternListResponse(BaseModel):
    patterns: List[Dict[str, Any]]
