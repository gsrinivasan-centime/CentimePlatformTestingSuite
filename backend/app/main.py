from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from app.core.config import settings
from app.core.database import engine
from app.models import models
from app.api import auth, test_cases, modules, sub_modules, features, releases, executions, reports, users, release_management, jira_stories, step_catalog, issues, settings as app_settings, smart_search
from app.services.file_storage import file_storage

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Centime Test Management System",
    description="Test case management and execution system for Cash Management System",
    version="1.0.0"
    # Note: We keep default redirect_slashes=True to handle both /api/path and /api/path/
    # Frontend should call APIs without trailing slashes to avoid 307 redirects
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
app.include_router(jira_stories.router, prefix="/api/jira-stories", tags=["JIRA Stories"])
app.include_router(releases.router, prefix="/api/releases", tags=["Releases"])
app.include_router(release_management.router, prefix="/api", tags=["Release Management"])
app.include_router(executions.router, prefix="/api/executions", tags=["Executions"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(step_catalog.router, prefix="/api/step-catalog", tags=["Step Catalog & Design Studio"])
app.include_router(issues.router, prefix="/api/issues", tags=["Issues"])
app.include_router(app_settings.router, prefix="/api/settings", tags=["Application Settings"])
app.include_router(smart_search.router, prefix="/api/search", tags=["Smart Search"])

@app.on_event("startup")
async def startup_event():
    """Verify configurations on startup"""
    print("\n" + "="*60)
    print("🚀 Starting Centime Test Management System")
    print("="*60)
    
    # Verify file storage configuration
    backend = file_storage.get_backend_name()
    print(f"\n📁 File Storage Backend: {backend.upper()}")
    print(f"   Verifying {backend} access...")
    
    if file_storage.verify_access():
        print(f"   ✓ {backend.capitalize()} is configured and accessible")
    else:
        print(f"   ⚠️  Warning: {backend.capitalize()} is not properly configured")
        print("   File uploads to issues may not work.")
    
    # Preload only the configured embedding model (to save memory)
    print("\n🧠 Embedding Model: Starting background preload...")
    try:
        from app.services.embedding_service import get_embedding_service
        from app.core.database import SessionLocal
        embedding_service = get_embedding_service()
        # Get a db session to check which model is configured
        db = SessionLocal()
        try:
            # Get configured model synchronously, then pass to async preload
            configured_model = embedding_service.get_configured_model(db)
        finally:
            db.close()
        asyncio.create_task(embedding_service.preload_models(configured_model=configured_model))
    except Exception as e:
        print(f"   ⚠️  Warning: Could not start model preload: {e}")
    
    print("\n" + "="*60 + "\n")

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
