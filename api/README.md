# XAU Pattern Analysis API

A comprehensive FastAPI-based REST API for analyzing XAUUSD (Gold) trading patterns and providing insights for algorithmic trading strategies.

## Features

- **Real-time Pattern Detection**: Identify candlestick patterns, support/resistance levels, and trend formations
- **Advanced Analytics**: Statistical analysis, correlation studies, and predictive modeling
- **RESTful API**: Clean, well-documented endpoints with OpenAPI/Swagger support
- **Database Integration**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Caching**: Redis-based caching for improved performance
- **Background Tasks**: Celery integration for async processing
- **Monitoring**: Prometheus metrics and structured logging
- **Testing**: Comprehensive test suite with pytest

## Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation

1. **Clone and setup**:
```bash
cd api
cp .env.example .env
# Edit .env with your configuration
```

2. **Install dependencies**:
```bash
pip install -r requirements-dev.txt
```

3. **Setup database**:
```bash
# Using Docker Compose (recommended)
docker-compose up -d db redis

# Manual setup
createdb xau_patterns
alembic upgrade head
```

4. **Run the application**:
```bash
# Development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Using Docker Compose
docker-compose up
```

### API Documentation

Once running, access the interactive documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
api/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration management
├── routers/             # API route handlers
│   ├── data.py         # Data endpoints
│   ├── patterns.py     # Pattern analysis
│   ├── analysis.py     # Advanced analytics
│   └── system.py       # System health/metrics
├── models/             # Pydantic models
├── services/           # Business logic
├── db/                 # Database layer
├── utils/              # Utility functions
├── tests/              # Test suite
├── alembic/            # Database migrations
└── docs/               # Additional documentation
```

## Development

### Running Tests
```bash
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest --cov=api          # With coverage
```

### Code Quality
```bash
black .                   # Format code
flake8                    # Linting
mypy .                    # Type checking
pre-commit install        # Install git hooks
```

### Database Migrations
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `API_HOST` | Server host | `0.0.0.0` |
| `API_PORT` | Server port | `8000` |
| `DEBUG` | Debug mode | `True` |
| `SECRET_KEY` | JWT secret key | `change-in-production` |

## Deployment

### Docker
```bash
docker build -t xau-api .
docker run -p 8000:8000 xau-api
```

### Production
```bash
pip install -r requirements.txt
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details
