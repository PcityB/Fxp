-- PostgreSQL schema for Forex Pattern Framework
-- This schema includes TimescaleDB extension for time series data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Time Series Data (TimescaleDB)
CREATE TABLE forex_data (
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION NOT NULL,
    low DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    volume DOUBLE PRECISION,
    PRIMARY KEY (timestamp, symbol, timeframe)
);

-- Create hypertable for time partitioning
SELECT create_hypertable('forex_data', 'timestamp');

-- Processed data with features
CREATE TABLE processed_data (
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION NOT NULL,
    low DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    volume DOUBLE PRECISION,
    -- Common technical indicators and features
    sma_5 DOUBLE PRECISION,
    sma_10 DOUBLE PRECISION,
    sma_20 DOUBLE PRECISION,
    ema_5 DOUBLE PRECISION,
    ema_10 DOUBLE PRECISION,
    ema_20 DOUBLE PRECISION,
    rsi_14 DOUBLE PRECISION,
    macd DOUBLE PRECISION,
    macd_signal DOUBLE PRECISION,
    macd_hist DOUBLE PRECISION,
    bollinger_upper DOUBLE PRECISION,
    bollinger_middle DOUBLE PRECISION,
    bollinger_lower DOUBLE PRECISION,
    atr_14 DOUBLE PRECISION,
    -- Normalized versions of features (can be extended as needed)
    norm_open DOUBLE PRECISION,
    norm_high DOUBLE PRECISION,
    norm_low DOUBLE PRECISION,
    norm_close DOUBLE PRECISION,
    norm_volume DOUBLE PRECISION,
    -- Additional features can be added as needed
    feature_data JSONB, -- For any additional features not explicitly defined
    PRIMARY KEY (timestamp, symbol, timeframe)
);

-- Create hypertable for time partitioning
SELECT create_hypertable('processed_data', 'timestamp');

-- Pattern Metadata
CREATE TABLE patterns (
    pattern_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    description TEXT,
    pic_code JSONB, -- Pattern Identification Code
    template_grid_dimensions VARCHAR(20), -- e.g., "10x10"
    discovery_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discovery_method VARCHAR(50),
    version INTEGER DEFAULT 1,
    timeframe VARCHAR(10) NOT NULL,
    window_size INTEGER NOT NULL,
    cluster_id INTEGER NOT NULL,
    n_occurrences INTEGER NOT NULL,
    visualization_path VARCHAR(255), -- Path to visualization file
    pattern_data JSONB -- Additional pattern metadata
);

-- Pattern Instances
CREATE TABLE pattern_instances (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(pattern_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ NOT NULL,
    match_score DOUBLE PRECISION,
    window_data JSONB, -- Actual window data for this instance
    UNIQUE (pattern_id, symbol, timeframe, start_timestamp)
);

-- Create index on timestamps for faster querying
CREATE INDEX idx_pattern_instances_timestamps ON pattern_instances(start_timestamp, end_timestamp);

-- Pattern Performance
CREATE TABLE pattern_performance (
    performance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(pattern_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    test_period_start TIMESTAMPTZ NOT NULL,
    test_period_end TIMESTAMPTZ NOT NULL,
    lookahead_periods INTEGER NOT NULL,
    profit_factor DOUBLE PRECISION,
    win_rate DOUBLE PRECISION,
    mean_return DOUBLE PRECISION,
    median_return DOUBLE PRECISION,
    std_return DOUBLE PRECISION,
    t_statistic DOUBLE PRECISION,
    p_value DOUBLE PRECISION,
    is_significant BOOLEAN,
    significance_threshold DOUBLE PRECISION,
    sharpe_ratio DOUBLE PRECISION,
    sortino_ratio DOUBLE PRECISION,
    max_drawdown DOUBLE PRECISION,
    avg_trade DOUBLE PRECISION,
    total_trades INTEGER,
    test_parameters JSONB,
    visualization_path VARCHAR(255), -- Path to performance visualization
    UNIQUE (pattern_id, symbol, timeframe, test_period_start, test_period_end)
);

-- User and System Data
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Computational Jobs
CREATE TABLE jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    parameters JSONB,
    result_summary JSONB,
    error_message TEXT
);

-- Create index on job status for faster filtering
CREATE INDEX idx_jobs_status ON jobs(status);

-- Visualizations
CREATE TABLE visualizations (
    visualization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    related_entity_type VARCHAR(50) NOT NULL, -- 'pattern', 'performance', etc.
    related_entity_id UUID NOT NULL, -- FK to the related entity
    visualization_type VARCHAR(50) NOT NULL, -- 'candlestick', 'heatmap', etc.
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create index for faster lookup by related entity
CREATE INDEX idx_visualizations_entity ON visualizations(related_entity_type, related_entity_id);

-- System Settings
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(user_id)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
('storage_mode', '{"primary": "database", "fallback": "file"}', 'Storage mode configuration'),
('file_storage_paths', '{"processed_data": "data/processed", "patterns": "data/patterns", "analysis": "data/analysis"}', 'File storage paths for fallback mode'),
('database_version', '"1.0"', 'Current database schema version');
