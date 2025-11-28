from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create engine with optimized settings for Supabase (cloud PostgreSQL)
# Aggressive pooling to minimize connection overhead with cloud database
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=20,  # Increased pool size to reuse connections
    max_overflow=30,  # Allow burst connections
    pool_recycle=300,  # Recycle connections after 5 minutes
    pool_timeout=30,  # Wait up to 30s for available connection
    echo=False,  # Set to True for SQL query logging during development
    connect_args={
        "connect_timeout": 10,  # Connection timeout
        "options": "-c statement_timeout=30000"  # 30 second query timeout
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
