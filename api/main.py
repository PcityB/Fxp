from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import sys
import json
import asyncio

from typing import List

# Add the parent directory to sys.path to import the core modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routers
from api.routers import data
from api.routers import patterns
from api.routers import analysis
from api.routers import system
from api.config_unified import settings

# Create FastAPI app
app = FastAPI(
    title="Forex Pattern Discovery API",
    description="API for discovering and analyzing novel candlestick patterns in forex data",
    version="1.0.0"
)

# Configure CORS using environment variables
cors_origins = settings.cors_origins if settings.cors_origins else ["http://localhost:5173", "http://localhost:5183"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["Patterns"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(system.router, prefix="/api/system", tags=["System"])

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to the Forex Pattern Discovery API",
        "documentation": "/docs",
        "redoc": "/redoc"
    }

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Handle disconnected clients
                self.active_connections.remove(connection)

manager = ConnectionManager()

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back for testing
            await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Exception handler for custom exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# Mount static files directory if it exists
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "visualizations")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.api_host, port=settings.api_port, reload=settings.debug)
