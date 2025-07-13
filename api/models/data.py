from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DataUploadResponse(BaseModel):
    filename: str
    timeframe: str
    rows: int
    columns: List[str]
    status: str

class PreprocessRequest(BaseModel):
    timeframe: str
    clean: bool = Field(default=True, description="Clean data by handling missing values and duplicates")
    engineer_features: bool = Field(default=True, description="Engineer additional features from the data")
    normalize: bool = Field(default=True, description="Normalize data using Min-Max scaling")

class PreprocessResponse(BaseModel):
    timeframe: str
    original_rows: int
    processed_rows: int
    features: List[str]
    status: str

class ProcessedDataResponse(BaseModel):
    timeframe: str
    data: Dict[str, Any]
    shape: List[int]
    features: List[str]
