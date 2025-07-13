from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
import psutil
import platform
from datetime import datetime, timedelta
import time

from models.system import SystemStatusResponse, TaskStatusResponse

router = APIRouter()

# Simple in-memory task storage
# In a production environment, this would be replaced with a proper database
tasks = {}

@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status():
    """
    Get system status and resource usage information.
    """
    try:
        # Get system information
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        
        # Format uptime
        days, remainder = divmod(uptime.total_seconds(), 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, seconds = divmod(remainder, 60)
        uptime_str = f"{int(days)}d {int(hours)}h {int(minutes)}m {int(seconds)}s"
        
        # Get memory usage
        memory = psutil.virtual_memory()
        memory_usage = {
            "total": f"{memory.total / (1024 ** 3):.2f} GB",
            "available": f"{memory.available / (1024 ** 3):.2f} GB",
            "used": f"{memory.used / (1024 ** 3):.2f} GB",
            "percent": f"{memory.percent}%"
        }
        
        # Get disk usage
        disk = psutil.disk_usage('/')
        disk_usage = {
            "total": f"{disk.total / (1024 ** 3):.2f} GB",
            "free": f"{disk.free / (1024 ** 3):.2f} GB",
            "used": f"{disk.used / (1024 ** 3):.2f} GB",
            "percent": f"{disk.percent}%"
        }
        
        return SystemStatusResponse(
            status="running",
            version="1.0.0",
            uptime=uptime_str,
            memory_usage=memory_usage,
            disk_usage=disk_usage
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system status: {str(e)}")

@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get status of a long-running task.
    
    - **task_id**: ID of the task to check
    """
    try:
        if task_id not in tasks:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
            
        return TaskStatusResponse(**tasks[task_id])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting task status: {str(e)}")

# Helper function to register a new task
def register_task(task_id: str, description: str):
    """
    Register a new task in the task registry.
    
    Args:
        task_id: Unique identifier for the task
        description: Description of the task
    """
    tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": 0.0,
        "started_at": datetime.now().isoformat(),
        "updated_at": None,
        "completed_at": None,
        "result": None,
        "error": None,
        "description": description
    }
    return tasks[task_id]

# Helper function to update task progress
def update_task_progress(task_id: str, progress: float, status: str = "running"):
    """
    Update the progress of a task.
    
    Args:
        task_id: Unique identifier for the task
        progress: Progress value between 0 and 1
        status: Current status of the task
    """
    if task_id in tasks:
        tasks[task_id]["progress"] = progress
        tasks[task_id]["status"] = status
        tasks[task_id]["updated_at"] = datetime.now().isoformat()
    return tasks.get(task_id)

# Helper function to complete a task
def complete_task(task_id: str, result=None, error=None):
    """
    Mark a task as completed or failed.
    
    Args:
        task_id: Unique identifier for the task
        result: Result data if task was successful
        error: Error message if task failed
    """
    if task_id in tasks:
        now = datetime.now().isoformat()
        tasks[task_id]["updated_at"] = now
        tasks[task_id]["completed_at"] = now
        
        if error:
            tasks[task_id]["status"] = "failed"
            tasks[task_id]["error"] = error
        else:
            tasks[task_id]["status"] = "completed"
            tasks[task_id]["progress"] = 1.0
            tasks[task_id]["result"] = result
    return tasks.get(task_id)
