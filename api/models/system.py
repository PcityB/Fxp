from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class SystemStatusResponse(BaseModel):
    status: str
    version: str
    uptime: str
    memory_usage: Dict[str, Any]
    disk_usage: Dict[str, Any]
    
class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: float
    started_at: str
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
