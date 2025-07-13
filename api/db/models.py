"""
SQLAlchemy ORM models for the Forex Pattern Framework database.
"""

import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class ForexData(Base):
    """
    Time series data for forex OHLCV data.
    This table is managed by TimescaleDB as a hypertable.
    """
    __tablename__ = "forex_data"
    
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    symbol = Column(String(20), primary_key=True, nullable=False)
    timeframe = Column(String(10), primary_key=True, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float)
    
    # Note: TimescaleDB hypertable conversion is done after table creation
    # using SQL: SELECT create_hypertable('forex_data', 'timestamp');

class ProcessedData(Base):
    """
    Processed forex data with technical indicators and features.
    This table is managed by TimescaleDB as a hypertable.
    """
    __tablename__ = "processed_data"
    
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    symbol = Column(String(20), primary_key=True, nullable=False)
    timeframe = Column(String(10), primary_key=True, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float)
    
    # Technical indicators
    sma_5 = Column(Float)
    sma_10 = Column(Float)
    sma_20 = Column(Float)
    ema_5 = Column(Float)
    ema_10 = Column(Float)
    ema_20 = Column(Float)
    rsi_14 = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    macd_hist = Column(Float)
    bollinger_upper = Column(Float)
    bollinger_middle = Column(Float)
    bollinger_lower = Column(Float)
    atr_14 = Column(Float)
    
    # Normalized features
    norm_open = Column(Float)
    norm_high = Column(Float)
    norm_low = Column(Float)
    norm_close = Column(Float)
    norm_volume = Column(Float)
    
    # Additional features stored as JSON
    feature_data = Column(JSONB)
    
    # Note: TimescaleDB hypertable conversion is done after table creation
    # using SQL: SELECT create_hypertable('processed_data', 'timestamp');

class Pattern(Base):
    """
    Pattern definitions and metadata.
    """
    __tablename__ = "patterns"
    
    pattern_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100))
    description = Column(String)
    pic_code = Column(JSONB)  # Pattern Identification Code
    template_grid_dimensions = Column(String(20))  # e.g., "10x10"
    discovery_timestamp = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    discovery_method = Column(String(50))
    version = Column(Integer, default=1)
    timeframe = Column(String(10), nullable=False)
    window_size = Column(Integer, nullable=False)
    cluster_id = Column(Integer, nullable=False)
    n_occurrences = Column(Integer, nullable=False)
    visualization_path = Column(String(255))  # Path to visualization file
    pattern_data = Column(JSONB)  # Additional pattern metadata
    
    # Relationships
    instances = relationship("PatternInstance", back_populates="pattern", cascade="all, delete-orphan")
    performances = relationship("PatternPerformance", back_populates="pattern", cascade="all, delete-orphan")

class PatternInstance(Base):
    """
    Individual occurrences of patterns.
    """
    __tablename__ = "pattern_instances"
    
    instance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pattern_id = Column(UUID(as_uuid=True), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False)
    timeframe = Column(String(10), nullable=False)
    start_timestamp = Column(TIMESTAMP(timezone=True), nullable=False)
    end_timestamp = Column(TIMESTAMP(timezone=True), nullable=False)
    match_score = Column(Float)
    window_data = Column(JSONB)  # Actual window data for this instance
    
    # Relationships
    pattern = relationship("Pattern", back_populates="instances")
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('pattern_id', 'symbol', 'timeframe', 'start_timestamp', name='uix_pattern_instance'),
        Index('idx_pattern_instances_timestamps', 'start_timestamp', 'end_timestamp'),
    )

class PatternPerformance(Base):
    """
    Performance metrics and backtesting results for patterns.
    """
    __tablename__ = "pattern_performance"
    
    performance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pattern_id = Column(UUID(as_uuid=True), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False)
    timeframe = Column(String(10), nullable=False)
    test_period_start = Column(TIMESTAMP(timezone=True), nullable=False)
    test_period_end = Column(TIMESTAMP(timezone=True), nullable=False)
    lookahead_periods = Column(Integer, nullable=False)
    profit_factor = Column(Float)
    win_rate = Column(Float)
    mean_return = Column(Float)
    median_return = Column(Float)
    std_return = Column(Float)
    t_statistic = Column(Float)
    p_value = Column(Float)
    is_significant = Column(Boolean)
    significance_threshold = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float)
    avg_trade = Column(Float)
    total_trades = Column(Integer)
    test_parameters = Column(JSONB)
    visualization_path = Column(String(255))  # Path to performance visualization
    
    # Relationships
    pattern = relationship("Pattern", back_populates="performances")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('pattern_id', 'symbol', 'timeframe', 'test_period_start', 'test_period_end', 
                         name='uix_pattern_performance'),
    )

class User(Base):
    """
    User information.
    """
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    last_login = Column(TIMESTAMP(timezone=True))
    
    # Relationships
    jobs = relationship("Job", back_populates="created_by_user")
    system_settings = relationship("SystemSetting", back_populates="updated_by_user")

class Job(Base):
    """
    Computational job tracking.
    """
    __tablename__ = "jobs"
    
    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    started_at = Column(TIMESTAMP(timezone=True))
    completed_at = Column(TIMESTAMP(timezone=True))
    parameters = Column(JSONB)
    result_summary = Column(JSONB)
    error_message = Column(String)
    
    # Relationships
    created_by_user = relationship("User", back_populates="jobs")
    
    # Indexes
    __table_args__ = (
        Index('idx_jobs_status', 'status'),
    )

class Visualization(Base):
    """
    Visualization file metadata.
    """
    __tablename__ = "visualizations"
    
    visualization_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    related_entity_type = Column(String(50), nullable=False)  # 'pattern', 'performance', etc.
    related_entity_id = Column(UUID(as_uuid=True), nullable=False)  # FK to the related entity
    visualization_type = Column(String(50), nullable=False)  # 'candlestick', 'heatmap', etc.
    file_path = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    meta_info = Column(JSONB)  # Renamed from 'metadata' to avoid SQLAlchemy conflict
    
    # Indexes
    __table_args__ = (
        Index('idx_visualizations_entity', 'related_entity_type', 'related_entity_id'),
    )

class SystemSetting(Base):
    """
    System settings and configuration.
    """
    __tablename__ = "system_settings"
    
    setting_key = Column(String(100), primary_key=True)
    setting_value = Column(JSONB, nullable=False)
    description = Column(String)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    
    # Relationships
    updated_by_user = relationship("User", back_populates="system_settings")
