# FastAPI Architecture for Forex Pattern Framework

## API Structure

```
/api
├── main.py                 # FastAPI application entry point
├── models/                 # Pydantic models for request/response
│   ├── __init__.py
│   ├── data.py             # Data preprocessing models
│   ├── patterns.py         # Pattern extraction models
│   └── analysis.py         # Pattern analysis models
├── routers/                # API route modules
│   ├── __init__.py
│   ├── data.py             # Data preprocessing endpoints
│   ├── patterns.py         # Pattern extraction endpoints
│   └── analysis.py         # Pattern analysis endpoints
├── services/               # Business logic services
│   ├── __init__.py
│   ├── data_service.py     # Data preprocessing service
│   ├── pattern_service.py  # Pattern extraction service
│   └── analysis_service.py # Pattern analysis service
└── utils/                  # Utility functions
    ├── __init__.py
    ├── file_utils.py       # File handling utilities
    └── validation.py       # Input validation utilities
```

## Endpoint Specifications

### Data Preprocessing Endpoints

#### 1. Upload Forex Data
- **Endpoint**: `POST /api/data/upload`
- **Description**: Upload forex data files
- **Request**: Multipart form with CSV file
- **Response**: File upload status and metadata

#### 2. List Available Data
- **Endpoint**: `GET /api/data/list`
- **Description**: List all available forex data files
- **Response**: List of available data files with metadata

#### 3. Preprocess Data
- **Endpoint**: `POST /api/data/preprocess`
- **Description**: Clean and preprocess forex data
- **Request**:
  ```json
  {
    "timeframe": "1h",
    "clean": true,
    "engineer_features": true,
    "normalize": true
  }
  ```
- **Response**: Preprocessing status and summary

#### 4. Get Processed Data
- **Endpoint**: `GET /api/data/processed/{timeframe}`
- **Description**: Get processed data for a specific timeframe
- **Response**: Processed data or download link

### Pattern Extraction Endpoints

#### 1. Extract Patterns
- **Endpoint**: `POST /api/patterns/extract`
- **Description**: Extract patterns from processed data
- **Request**:
  ```json
  {
    "timeframe": "1h",
    "window_size": 5,
    "max_patterns": 5000,
    "grid_rows": 10,
    "grid_cols": 10,
    "n_clusters": 20
  }
  ```
- **Response**: Extraction status and summary

#### 2. List Extracted Patterns
- **Endpoint**: `GET /api/patterns/list`
- **Description**: List all extracted pattern sets
- **Response**: List of available pattern sets with metadata

#### 3. Get Pattern Details
- **Endpoint**: `GET /api/patterns/{timeframe}`
- **Description**: Get details of extracted patterns for a timeframe
- **Response**: Pattern metadata and cluster information

#### 4. Get Pattern Visualization
- **Endpoint**: `GET /api/patterns/{timeframe}/visualize/{cluster_id}`
- **Description**: Get visualization of a specific pattern cluster
- **Response**: Visualization image or data

### Pattern Analysis Endpoints

#### 1. Analyze Patterns
- **Endpoint**: `POST /api/analysis/analyze`
- **Description**: Analyze extracted patterns for profitability and significance
- **Request**:
  ```json
  {
    "timeframe": "1h",
    "lookahead_periods": 10,
    "significance_threshold": 0.05,
    "min_occurrences": 5
  }
  ```
- **Response**: Analysis status and summary

#### 2. List Analysis Results
- **Endpoint**: `GET /api/analysis/list`
- **Description**: List all available analysis results
- **Response**: List of available analysis results with metadata

#### 3. Get Analysis Details
- **Endpoint**: `GET /api/analysis/{timeframe}`
- **Description**: Get detailed analysis results for a timeframe
- **Response**: Comprehensive analysis data including profitability metrics

#### 4. Get Analysis Visualization
- **Endpoint**: `GET /api/analysis/{timeframe}/visualize`
- **Description**: Get visualization of analysis results
- **Response**: Visualization data or image

### System Endpoints

#### 1. System Status
- **Endpoint**: `GET /api/system/status`
- **Description**: Get system status and resource usage
- **Response**: System status information

#### 2. Task Status
- **Endpoint**: `GET /api/system/tasks/{task_id}`
- **Description**: Get status of a long-running task
- **Response**: Task status and progress information

## Data Models

### Data Preprocessing Models

```python
class DataUploadResponse(BaseModel):
    filename: str
    timeframe: str
    rows: int
    columns: List[str]
    status: str

class PreprocessRequest(BaseModel):
    timeframe: str
    clean: bool = True
    engineer_features: bool = True
    normalize: bool = True

class PreprocessResponse(BaseModel):
    timeframe: str
    original_rows: int
    processed_rows: int
    features: List[str]
    status: str
```

### Pattern Extraction Models

```python
class PatternExtractionRequest(BaseModel):
    timeframe: str
    window_size: int = 5
    max_patterns: Optional[int] = 5000
    grid_rows: int = 10
    grid_cols: int = 10
    n_clusters: Optional[int] = None

class PatternExtractionResponse(BaseModel):
    timeframe: str
    extraction_date: str
    n_patterns: int
    window_size: int
    n_clusters: int
    status: str
```

### Pattern Analysis Models

```python
class PatternAnalysisRequest(BaseModel):
    timeframe: str
    lookahead_periods: int = 10
    significance_threshold: float = 0.05
    min_occurrences: int = 5

class PatternAnalysisResponse(BaseModel):
    timeframe: str
    analysis_date: str
    n_patterns: int
    n_clusters: int
    profitable_clusters: int
    significant_clusters: int
    status: str
```

## Implementation Notes

1. **Asynchronous Processing**: Long-running tasks like pattern extraction and analysis should be implemented asynchronously with background workers.

2. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes and detailed error messages.

3. **Input Validation**: Thorough validation of all input parameters using Pydantic models.

4. **File Storage**: Efficient handling of data files and results with appropriate caching.

5. **Documentation**: Auto-generated API documentation using FastAPI's built-in Swagger UI.

6. **Authentication**: Optional JWT-based authentication for production deployment.

7. **Rate Limiting**: Consider implementing rate limiting for public-facing deployments.
