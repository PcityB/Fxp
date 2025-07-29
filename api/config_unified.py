from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, RedisDsn, validator
from typing import List
import os


class settings(BaseSettings):
    # API Configuration
    api_host: str
    api_port: int = 8000
    debug: bool = False
    secret_key: str
    
    # Database Configuration
    database_url: PostgresDsn
    test_database_url: PostgresDsn
    
    # Redis Configuration
    redis_url: RedisDsn
    
    # Supabase Configuration
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    
    # External API Keys
    alpha_vantage_api_key: str = ""
    binance_api_key: str = ""
    binance_secret_key: str = ""
    
    # CORS Configuration
    cors_origins: List[str] = []

    @validator("cors_origins", pre=True)
    def validate_cors_origins(cls, v):
        if isinstance(v, str):
            # Split comma separated string into list
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if not v:
            # If empty or None, fallback to default localhost origins
            return ["http://localhost:5173", "http://localhost:5183"]
        return v
    
    # Logging Configuration
    log_level: str = "INFO"
    log_format: str = "json"
    
    # Rate Limiting
    rate_limit_per_minute: int = 100
    
    # Feature Flags
    enable_metrics: bool = True
    enable_caching: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = settings()
