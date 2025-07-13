# Forex Pattern Discovery API Documentation

## Overview

This API provides a comprehensive interface to the Forex Pattern Discovery Framework, allowing users to programmatically access all features of the framework including data preprocessing, pattern extraction, and pattern analysis.

## Database Support

The API now supports PostgreSQL with TimescaleDB extension for efficient storage and retrieval of time series data, patterns, and analysis results. This provides several benefits:

- Improved performance for large datasets
- Better data integrity and reliability
- Advanced query capabilities for pattern analysis
- Efficient storage of time series data

For setup instructions, see the [PostgreSQL Setup Guide](postgresql_setup.md).

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, the API does not require authentication. For production deployment, consider implementing JWT-based authentication.

## API Endpoints

### Root

#### Get API Information

```
GET /
```

Returns basic information about the API and links to documentation.

**Response Example:**
```json
{
  "message": "Welcome to the Forex Pattern Discovery API",
  "documentation": "/docs",
  "redoc": "/redoc"
}
```

### Data Management

#### Upload Forex Data

```
POST /api/data/upload
```

Upload forex data file for a specific timeframe.

**Parameters:**
- `file`: CSV file containing forex data (form data)
- `timeframe`: Timeframe of the data, e.g., '1h', '4h', '1d' (form data)

**Response Example:**
```json
{
  "filename": "XAU_1h_data.csv",
  "timeframe": "1h",
  "rows": 119585,
  "columns": ["date", "time", "open", "high", "low", "close", "volume"],
  "status": "success"
}
```

#### List Available Data

```
GET /api/data/list
```

List all available forex data files.

**Response Example:**
```json
{
  "data": [
    {
      "filename": "XAU_1h_data.csv",
      "timeframe": "1h",
      "rows": 119585,
      "columns": ["date", "time", "open", "high", "low", "close", "volume"],
      "size_kb": 15678.45
    },
    {
      "filename": "XAU_4h_data.csv",
      "timeframe": "4h",
      "rows": 31510,
      "columns": ["date", "time", "open", "high", "low", "close", "volume"],
      "size_kb": 4321.78
    }
  ]
}
```

#### Preprocess Data

```
POST /api/data/preprocess
```

Clean and preprocess forex data for a specific timeframe.

**Request Body:**
```json
{
  "timeframe": "1h",
  "clean": true,
  "engineer_features": true,
  "normalize": true
}
```

**Parameters:**
- `timeframe`: Timeframe to preprocess (required)
- `clean`: Clean data by handling missing values and duplicates (default: true)
- `engineer_features`: Engineer additional features from the data (default: true)
- `normalize`: Normalize data using Min-Max scaling (default: true)

**Response Example:**
```json
{
  "timeframe": "1h",
  "original_rows": 119585,
  "processed_rows": 119580,
  "features": ["open", "high", "low", "close", "volume", "body_size", "upper_shadow", "lower_shadow", "rsi_14", "macd", "atr_14"],
  "status": "success"
}
```

#### Get Processed Data

```
GET /api/data/processed/{timeframe}
```

Get processed data for a specific timeframe.

**Parameters:**
- `timeframe`: Timeframe to get data for (path parameter)
- `limit`: Limit the number of rows returned (query parameter, default: 100)

**Response Example:**
```json
{
  "timeframe": "1h",
  "data": [
    {
      "date": "2020-01-01",
      "time": "00:00:00",
      "open": 1517.23,
      "high": 1519.45,
      "low": 1516.78,
      "close": 1518.92,
      "volume": 1234,
      "body_size": 1.69,
      "upper_shadow": 0.53,
      "lower_shadow": 0.45,
      "rsi_14": 56.78,
      "macd": 0.23,
      "atr_14": 1.45
    },
    // ... more rows
  ],
  "shape": [100, 12],
  "features": ["open", "high", "low", "close", "volume", "body_size", "upper_shadow", "lower_shadow", "rsi_14", "macd", "atr_14"]
}
```

#### Download Processed Data

```
GET /api/data/download/{timeframe}
```

Download processed data for a specific timeframe as a CSV file.

**Parameters:**
- `timeframe`: Timeframe to download data for (path parameter)

**Response:**
CSV file download

#### Get Storage Mode

```
GET /api/data/storage-mode
```

Get current storage mode configuration.

**Response Example:**
```json
{
  "storage_mode": {
    "primary": "database",
    "fallback": "file"
  }
}
```

#### Set Storage Mode

```
POST /api/data/storage-mode
```

Set storage mode configuration.

**Parameters:**
- `primary`: Primary storage mode ('database' or 'file') (form data)
- `fallback`: Fallback storage mode ('database', 'file', or 'none') (form data)

**Response Example:**
```json
{
  "status": "success",
  "storage_mode": {
    "primary": "database",
    "fallback": "file"
  }
}
```

### Pattern Extraction

#### Extract Patterns

```
POST /api/patterns/extract
```

Extract patterns from processed forex data.

**Request Body:**
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

**Parameters:**
- `timeframe`: Timeframe to extract patterns from (required)
- `window_size`: Size of the sliding window for pattern extraction (default: 5)
- `max_patterns`: Maximum number of patterns to extract (default: 5000)
- `grid_rows`: Number of rows in the Template Grid (default: 10)
- `grid_cols`: Number of columns in the Template Grid (default: 10)
- `n_clusters`: Number of clusters to form (default: null, estimated automatically)

**Response Example:**
```json
{
  "timeframe": "1h",
  "extraction_date": "2025-05-25 02:15:30",
  "n_patterns": 5000,
  "window_size": 5,
  "n_clusters": 20,
  "status": "success"
}
```

#### List Extracted Patterns

```
GET /api/patterns/list
```

List all extracted pattern sets.

**Response Example:**
```json
{
  "patterns": [
    {
      "timeframe": "1h",
      "extraction_date": "2025-05-25 02:15:30",
      "n_patterns": 5000,
      "window_size": 5,
      "n_clusters": 20,
      "file": "1h_patterns.json"
    },
    {
      "timeframe": "4h",
      "extraction_date": "2025-05-25 03:20:45",
      "n_patterns": 3000,
      "window_size": 5,
      "n_clusters": 15,
      "file": "4h_patterns.json"
    }
  ]
}
```

#### Get Pattern Details

```
GET /api/patterns/{timeframe}
```

Get details of extracted patterns for a timeframe.

**Parameters:**
- `timeframe`: Timeframe to get pattern details for (path parameter)

**Response Example:**
```json
{
  "timeframe": "1h",
  "extraction_date": "2025-05-25 02:15:30",
  "n_patterns": 5000,
  "window_size": 5,
  "cluster_labels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  "representatives": {
    "0": {
      "timestamp": "2020-01-15T10:00:00",
      "index": 342,
      "count": 278
    },
    "1": {
      "timestamp": "2020-02-23T14:00:00",
      "index": 1245,
      "count": 312
    }
    // ... more representatives
  },
  "status": "success"
}
```

#### Get Pattern Visualization

```
GET /api/patterns/{timeframe}/visualize/{cluster_id}
```

Get visualization of a specific pattern cluster.

**Parameters:**
- `timeframe`: Timeframe of the patterns (path parameter)
- `cluster_id`: Cluster ID to visualize (path parameter)

**Response:**
PNG image of the pattern visualization

#### Download Patterns

```
GET /api/patterns/{timeframe}/download
```

Download pattern data for a specific timeframe as a JSON file.

**Parameters:**
- `timeframe`: Timeframe to download patterns for (path parameter)

**Response:**
JSON file download

### Pattern Analysis

#### Analyze Patterns

```
POST /api/analysis/analyze
```

Analyze extracted patterns for profitability and statistical significance.

**Request Body:**
```json
{
  "timeframe": "1h",
  "lookahead_periods": 10,
  "significance_threshold": 0.05,
  "min_occurrences": 5
}
```

**Parameters:**
- `timeframe`: Timeframe to analyze patterns for (required)
- `lookahead_periods`: Number of periods to look ahead for returns calculation (default: 10)
- `significance_threshold`: P-value threshold for statistical significance (default: 0.05)
- `min_occurrences`: Minimum number of pattern occurrences required for analysis (default: 5)

**Response Example:**
```json
{
  "timeframe": "1h",
  "analysis_date": "2025-05-25 04:30:15",
  "n_patterns": 5000,
  "n_clusters": 20,
  "profitable_clusters": 12,
  "significant_clusters": 8,
  "status": "success"
}
```

#### List Analysis Results

```
GET /api/analysis/list
```

List all available analysis results.

**Response Example:**
```json
{
  "analyses": [
    {
      "timeframe": "1h",
      "analysis_date": "2025-05-25 04:30:15",
      "lookahead_periods": 10,
      "n_clusters": 20,
      "profitable_clusters": 12,
      "significant_clusters": 8,
      "file": "1h_analysis.json"
    },
    {
      "timeframe": "4h",
      "analysis_date": "2025-05-25 05:45:30",
      "lookahead_periods": 10,
      "n_clusters": 15,
      "profitable_clusters": 9,
      "significant_clusters": 6,
      "file": "4h_analysis.json"
    }
  ]
}
```

#### Get Analysis Details

```
GET /api/analysis/{timeframe}
```

Get detailed analysis results for a timeframe.

**Parameters:**
- `timeframe`: Timeframe to get analysis details for (path parameter)

**Response Example:**
```json
{
  "timeframe": "1h",
  "analysis_date": "2025-05-25 04:30:15",
  "lookahead_periods": 10,
  "significance_threshold": 0.05,
  "profitability": {
    "avg_return": 0.12,
    "win_rate": 0.58,
    "profit_factor": 1.45
  },
  "statistical_significance": {
    "0": {
      "p_value": 0.023,
      "t_statistic": 2.45,
      "significant": true
    },
    "1": {
      "p_value": 0.078,
      "t_statistic": 1.82,
      "significant": false
    }
    // ... more clusters
  },
  "cluster_returns": {
    "0": {
      "count": 278,
      "avg_return": 0.23,
      "median_return": 0.18,
      "std_return": 0.15,
      "win_rate": 0.67,
      "profit_factor": 1.53
    },
    "1": {
      "count": 312,
      "avg_return": -0.08,
      "median_return": -0.05,
      "std_return": 0.12,
      "win_rate": 0.42,
      "profit_factor": 0.67
    }
    // ... more clusters
  },
  "status": "success"
}
```

#### Get Analysis Visualization

```
GET /api/analysis/{timeframe}/visualize
```

Get visualization of analysis results.

**Parameters:**
- `timeframe`: Timeframe of the analysis (path parameter)
- `chart_type`: Type of visualization to return (query parameter, options: "profitability", "significance", "distribution", default: "profitability")

**Response:**
PNG image of the analysis visualization

#### Download Analysis

```
GET /api/analysis/{timeframe}/download
```

Download analysis data for a specific timeframe as a JSON file.

**Parameters:**
- `timeframe`: Timeframe to download analysis for (path parameter)

**Response:**
JSON file download

### System

#### Get System Status

```
GET /api/system/status
```

Get system status and resource usage information.

**Response Example:**
```json
{
  "status": "running",
  "version": "1.0.0",
  "uptime": "2d 5h 30m 15s",
  "memory_usage": {
    "total": "16.00 GB",
    "available": "8.45 GB",
    "used": "7.55 GB",
    "percent": "47.2%"
  },
  "disk_usage": {
    "total": "100.00 GB",
    "free": "65.34 GB",
    "used": "34.66 GB",
    "percent": "34.7%"
  },
  "database": {
    "connected": true,
    "type": "PostgreSQL",
    "version": "14.5",
    "timescaledb_enabled": true
  }
}
```

#### Get Task Status

```
GET /api/system/tasks/{task_id}
```

Get status of a long-running task.

**Parameters:**
- `task_id`: ID of the task to check (path parameter)

**Response Example:**
```json
{
  "task_id": "pattern_extraction_1h_a1b2c3d4",
  "status": "running",
  "progress": 0.75,
  "started_at": "2025-05-25T02:15:30",
  "updated_at": "2025-05-25T02:18:45",
  "completed_at": null,
  "result": null,
  "error": null
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: The request was successful
- `400 Bad Request`: The request was invalid or cannot be served
- `404 Not Found`: The requested resource does not exist
- `422 Unprocessable Entity`: The request was well-formed but contains semantic errors
- `500 Internal Server Error`: An error occurred on the server

Error responses include a detail message explaining the error:

```json
{
  "detail": "Error message explaining what went wrong"
}
```

## Interactive Documentation

The API provides interactive documentation through Swagger UI and ReDoc:

- Swagger UI: `/docs`
- ReDoc: `/redoc`

These interfaces allow you to explore the API endpoints, view request/response schemas, and even test the API directly from your browser.

## Running the API

To start the API server:

```bash
cd /path/to/forex_pattern_framework/api
python main.py
```

The API will be available at `http://localhost:8000`.

## Database Configuration

The API now supports PostgreSQL with TimescaleDB for efficient storage of time series data and patterns. For setup instructions, see the [PostgreSQL Setup Guide](postgresql_setup.md).

Key benefits of using PostgreSQL:
- Improved performance for large datasets
- Better data integrity and reliability
- Advanced query capabilities for pattern analysis
- Efficient storage of time series data with TimescaleDB

The API supports fallback to file-based storage if the database is unavailable, ensuring robustness in various deployment scenarios.

## Dependencies

The API requires the following Python packages:

- fastapi
- uvicorn
- pandas
- numpy
- scikit-learn
- tslearn
- matplotlib
- python-multipart
- sqlalchemy
- psycopg2-binary
- python-dotenv
- httpx (for testing)
- pytest (for testing)
- psutil
