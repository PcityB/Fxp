import pytest
from fastapi.testclient import TestClient
import os
import sys
import json

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "documentation" in response.json()

def test_data_list_endpoint():
    """Test the data list endpoint."""
    response = client.get("/api/data/list")
    assert response.status_code == 200
    assert "data" in response.json()

def test_patterns_list_endpoint():
    """Test the patterns list endpoint."""
    response = client.get("/api/patterns/list")
    assert response.status_code == 200
    assert "patterns" in response.json()

def test_analysis_list_endpoint():
    """Test the analysis list endpoint."""
    response = client.get("/api/analysis/list")
    assert response.status_code == 200
    assert "analyses" in response.json()

def test_system_status_endpoint():
    """Test the system status endpoint."""
    response = client.get("/api/system/status")
    assert response.status_code == 200
    assert "status" in response.json()
    assert "memory_usage" in response.json()
    assert "disk_usage" in response.json()

def test_nonexistent_endpoint():
    """Test a nonexistent endpoint."""
    response = client.get("/api/nonexistent")
    assert response.status_code == 404

def test_invalid_timeframe():
    """Test an invalid timeframe."""
    response = client.get("/api/data/processed/invalid_timeframe")
    assert response.status_code == 404
    assert "detail" in response.json()

def test_invalid_pattern_extraction_request():
    """Test an invalid pattern extraction request."""
    response = client.post(
        "/api/patterns/extract",
        json={"timeframe": "nonexistent"}
    )
    assert response.status_code == 404 or response.status_code == 422
    assert "detail" in response.json()

def test_invalid_pattern_analysis_request():
    """Test an invalid pattern analysis request."""
    response = client.post(
        "/api/analysis/analyze",
        json={"timeframe": "nonexistent"}
    )
    assert response.status_code == 404 or response.status_code == 422
    assert "detail" in response.json()

def test_invalid_task_id():
    """Test an invalid task ID."""
    response = client.get("/api/system/tasks/nonexistent_task_id")
    assert response.status_code == 404
    assert "detail" in response.json()
