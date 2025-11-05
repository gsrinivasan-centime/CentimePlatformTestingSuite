from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models import models
from app.api import auth, test_cases, modules, sub_modules, features, releases, executions, reports, users, release_management

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Centime Test Management System",
    description="Test case management and execution system for Cash Management System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(modules.router, prefix="/api/modules", tags=["Modules"])
app.include_router(sub_modules.router, prefix="/api/sub-modules", tags=["Sub-Modules"])
app.include_router(features.router, prefix="/api/features", tags=["Features"])
app.include_router(test_cases.router, prefix="/api/test-cases", tags=["Test Cases"])
app.include_router(releases.router, prefix="/api/releases", tags=["Releases"])
app.include_router(release_management.router, prefix="/api", tags=["Release Management"])
app.include_router(executions.router, prefix="/api/executions", tags=["Executions"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

@app.get("/")
def read_root():
    return {
        "message": "Centime Test Management System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
