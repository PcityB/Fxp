from pydantic import BaseSettings, RedisDsn
from typing import List


class Settings(BaseSettings):
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    secret_key: str = "your-secret-key-change-this-in-production"
    
    # Supabase Configuration
    # These should be set in your .env file with actual values from Supabase dashboard
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = "your-anon-key"
    supabase_service_key: str = "your-service-key"
    
    # Database Configuration (using Supabase PostgreSQL)
    # The DATABASE_URL should point to your Supabase PostgreSQL instance
    database_url: str = "postgresql://postgres:password@db.project.supabase.co:5432/postgres"
    test_database_url: str = "postgresql://postgres:password@db.project.supabase.co:5432/postgres"
    
    # Redis Configuration (for caching)
    redis_url: RedisDsn = "redis://localhost:6379/0"
    
    # External API Keys
    alpha_vantage_api_key: str = ""
    binance_api_key: str = ""
    binance_secret_key: str = ""
    
    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
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


settings = Settings()
