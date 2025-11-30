"""
Navigation Registry Service
Provides dynamic context about available pages, modules, users, and releases
for the Smart Search LLM classifier.
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from functools import lru_cache
import time

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    NavigationRegistry, Module, User, Release, 
    TestCase, Issue, JiraStory
)
from app.schemas.smart_search import (
    NavigationTarget, NavigationContext, ModuleInfo, 
    UserInfo, ReleaseInfo, FilterDefinition
)

logger = logging.getLogger(__name__)

# Cache TTL in seconds
REGISTRY_CACHE_TTL = 300  # 5 minutes

# Module aliases for common abbreviations
MODULE_ALIASES = {
    "Account Payable": ["AP", "Payable", "Payables", "A/P"],
    "Account Receivables": ["AR", "Receivable", "Receivables", "A/R"],
    "Cash Management": ["CM", "Cash"],
    "General Ledger": ["GL", "Ledger"],
    "Fixed Assets": ["FA", "Assets"],
    "Inventory": ["INV", "Stock"],
    "Purchasing": ["PO", "Purchase"],
    "Sales": ["SO", "Sales Order"],
}


class NavigationRegistryService:
    """Service for managing navigation registry and context"""
    
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, float] = {}
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cache entry is still valid"""
        if key not in self._cache_timestamps:
            return False
        age = time.time() - self._cache_timestamps[key]
        return age < REGISTRY_CACHE_TTL
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get value from cache if valid"""
        if self._is_cache_valid(key):
            return self._cache.get(key)
        return None
    
    def _set_cache(self, key: str, value: Any) -> None:
        """Set value in cache"""
        self._cache[key] = value
        self._cache_timestamps[key] = time.time()
    
    def invalidate_cache(self, key: Optional[str] = None) -> None:
        """Invalidate cache entries"""
        if key:
            self._cache.pop(key, None)
            self._cache_timestamps.pop(key, None)
        else:
            self._cache.clear()
            self._cache_timestamps.clear()
    
    def get_navigation_targets(self, db: Session) -> List[NavigationTarget]:
        """Get all active navigation targets from registry"""
        cache_key = "navigation_targets"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        targets = db.query(NavigationRegistry).filter(
            NavigationRegistry.is_active == True
        ).order_by(NavigationRegistry.display_order).all()
        
        result = []
        for t in targets:
            filters = []
            if t.filters:
                for f in t.filters:
                    filters.append(FilterDefinition(
                        field=f.get('field', ''),
                        label=f.get('label', ''),
                        type=f.get('type', 'text'),
                        options=f.get('options')
                    ))
            
            result.append(NavigationTarget(
                page_key=t.page_key,
                display_name=t.display_name,
                path=t.path,
                entity_type=t.entity_type,
                filters=filters,
                searchable_fields=t.searchable_fields or [],
                capabilities=t.capabilities or [],
                example_queries=t.example_queries or [],
                is_active=t.is_active
            ))
        
        self._set_cache(cache_key, result)
        return result
    
    def get_modules(self, db: Session) -> List[ModuleInfo]:
        """Get all modules with aliases"""
        cache_key = "modules"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        modules = db.query(Module).all()
        result = []
        for m in modules:
            aliases = MODULE_ALIASES.get(m.name, [])
            result.append(ModuleInfo(
                id=m.id,
                name=m.name,
                aliases=aliases
            ))
        
        self._set_cache(cache_key, result)
        return result
    
    def get_users(self, db: Session) -> List[UserInfo]:
        """Get all active users"""
        cache_key = "users"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        users = db.query(User).filter(User.is_active == True).all()
        result = [
            UserInfo(id=u.id, email=u.email, full_name=u.full_name)
            for u in users
        ]
        
        self._set_cache(cache_key, result)
        return result
    
    def get_releases(self, db: Session) -> List[ReleaseInfo]:
        """Get all releases"""
        cache_key = "releases"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        releases = db.query(Release).order_by(Release.release_date.desc()).all()
        result = [
            ReleaseInfo(
                id=r.id, 
                version=r.version, 
                name=r.name,
                status=r.overall_status
            )
            for r in releases
        ]
        
        self._set_cache(cache_key, result)
        return result
    
    def get_current_release(self, db: Session) -> Optional[ReleaseInfo]:
        """
        Get the current/active release.
        Priority:
        1. Release with status='in_progress' and closest target_date to today
        2. Release with latest target_date if no in_progress
        """
        # First try to find in_progress release
        release = db.query(Release).filter(
            Release.overall_status == 'in_progress'
        ).order_by(Release.release_date.desc()).first()
        
        # If no in_progress, get the one with closest future date
        if not release:
            today = datetime.utcnow()
            release = db.query(Release).filter(
                Release.release_date >= today
            ).order_by(Release.release_date.asc()).first()
        
        # If still none, get the latest release
        if not release:
            release = db.query(Release).order_by(
                Release.release_date.desc()
            ).first()
        
        if release:
            return ReleaseInfo(
                id=release.id,
                version=release.version,
                name=release.name,
                status=release.overall_status
            )
        return None
    
    def get_full_context(self, db: Session, current_user: User) -> NavigationContext:
        """Get complete context for LLM prompt building"""
        return NavigationContext(
            pages=self.get_navigation_targets(db),
            current_user=UserInfo(
                id=current_user.id,
                email=current_user.email,
                full_name=current_user.full_name
            ),
            current_release=self.get_current_release(db),
            modules=self.get_modules(db),
            users=self.get_users(db),
            releases=self.get_releases(db)
        )
    
    def resolve_module_name(self, name: str, db: Session) -> Optional[int]:
        """
        Resolve module name or alias to module ID.
        Supports fuzzy matching and aliases.
        """
        modules = self.get_modules(db)
        name_lower = name.lower().strip()
        
        for m in modules:
            # Exact match
            if m.name.lower() == name_lower:
                return m.id
            # Alias match
            for alias in m.aliases:
                if alias.lower() == name_lower:
                    return m.id
        
        # Partial match (contains)
        for m in modules:
            if name_lower in m.name.lower() or m.name.lower() in name_lower:
                return m.id
        
        return None
    
    def resolve_user_name(self, name: str, db: Session) -> Optional[int]:
        """
        Resolve user name to user ID.
        Supports partial matching on full_name and email.
        """
        users = self.get_users(db)
        name_lower = name.lower().strip()
        
        for u in users:
            # Full name match
            if u.full_name and u.full_name.lower() == name_lower:
                return u.id
            # Email match
            if u.email.lower() == name_lower:
                return u.id
            # First name match
            if u.full_name:
                first_name = u.full_name.split()[0].lower()
                if first_name == name_lower:
                    return u.id
        
        # Partial match
        for u in users:
            if u.full_name and name_lower in u.full_name.lower():
                return u.id
            if name_lower in u.email.lower():
                return u.id
        
        return None
    
    def resolve_release_version(self, version: str, db: Session) -> Optional[int]:
        """
        Resolve release version string to release ID.
        """
        releases = self.get_releases(db)
        version_lower = version.lower().strip()
        
        for r in releases:
            if r.version.lower() == version_lower:
                return r.id
            if r.name and r.name.lower() == version_lower:
                return r.id
        
        # Partial match
        for r in releases:
            if version_lower in r.version.lower():
                return r.id
        
        return None
    
    def get_entity_counts(self, db: Session) -> Dict[str, int]:
        """Get counts of various entities for context"""
        return {
            "test_cases": db.query(func.count(TestCase.id)).scalar() or 0,
            "issues": db.query(func.count(Issue.id)).scalar() or 0,
            "stories": db.query(func.count(JiraStory.id)).scalar() or 0,
            "modules": db.query(func.count(Module.id)).scalar() or 0,
            "releases": db.query(func.count(Release.id)).scalar() or 0,
        }


# Singleton instance
navigation_registry_service = NavigationRegistryService()
