from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create engine with appropriate settings for PostgreSQL
# Pool settings for better connection management
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=10,  # Maximum number of connections to keep open
    max_overflow=20,  # Maximum number of connections that can be created beyond pool_size
    echo=False  # Set to True for SQL query logging during development
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
