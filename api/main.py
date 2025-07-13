from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import sys

# Add the parent directory to sys.path to import the core modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routers
from routers import data, patterns, analysis, system

# Create FastAPI app
app = FastAPI(
    title="Forex Pattern Discovery API",
    description="API for discovering and analyzing novel candlestick patterns in forex data",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
