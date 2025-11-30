"""
Smart Search Schemas
Pydantic models for smart search requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SearchIntent(str, Enum):
    """Possible search intents identified by LLM"""
    VIEW_TEST_CASES = "view_test_cases"
    VIEW_ISSUES = "view_issues"
    VIEW_STORIES = "view_stories"
    VIEW_RELEASE = "view_release"
    VIEW_RELEASE_DASHBOARD = "view_release_dashboard"
    VIEW_RELEASE_STORIES = "view_release_stories"
    VIEW_RELEASE_ISSUES = "view_release_issues"
    VIEW_MODULES = "view_modules"
    VIEW_REPORTS = "view_reports"
    VIEW_EXECUTIONS = "view_executions"
    VIEW_DASHBOARD = "view_dashboard"
    UNKNOWN = "unknown"


class SmartSearchRequest(BaseModel):
    """Request body for smart search API"""
    query: str = Field(..., min_length=2, max_length=500, description="Natural language search query")


class NavigationSuggestion(BaseModel):
    """Suggestion for navigation when confidence is low"""
    label: str
    path: str
    query: Optional[str] = None


class SmartSearchResponse(BaseModel):
    """Response from smart search API"""
    success: bool
    navigate_to: Optional[str] = None
    query_params: Optional[Dict[str, str]] = None
    entity_ids: Optional[List[int]] = None
    message: str
    intent: Optional[str] = None
    confidence: Optional[float] = None
    suggestions: Optional[List[NavigationSuggestion]] = None
    # Token usage information
    token_usage: Optional['TokenUsage'] = None
    cached: bool = False
    response_time_ms: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "navigate_to": "/test-cases",
                "query_params": {"module": "1", "search": "ACH"},
                "entity_ids": [3, 7, 1, 12],
                "message": "Found 4 test cases related to ACH in Account Payable",
                "intent": "view_test_cases",
                "confidence": 0.95,
                "token_usage": {
                    "input_tokens": 1250,
                    "output_tokens": 85,
                    "total_tokens": 1335
                },
                "cached": False,
                "response_time_ms": 450
            }
        }


class LLMClassificationResult(BaseModel):
    """Internal model for LLM classification output"""
    intent: str
    target_page: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    requires_semantic_search: bool = False
    semantic_query: Optional[str] = None
    confidence: float = 0.0


class TokenUsage(BaseModel):
    """Token usage for a single query"""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


# ============ Navigation Registry Schemas ============

class FilterDefinition(BaseModel):
    """Definition of a filter field"""
    field: str
    label: str
    type: str  # select, text, date
    options: Optional[List[str]] = None


class NavigationTarget(BaseModel):
    """A navigation target/page in the registry"""
    page_key: str
    display_name: str
    path: str
    entity_type: Optional[str] = None
    filters: List[FilterDefinition] = Field(default_factory=list)
    searchable_fields: List[str] = Field(default_factory=list)
    capabilities: List[str] = Field(default_factory=list)
    example_queries: List[str] = Field(default_factory=list)
    is_active: bool = True


class ModuleInfo(BaseModel):
    """Module info for context resolution"""
    id: int
    name: str
    aliases: List[str] = Field(default_factory=list)


class UserInfo(BaseModel):
    """User info for context resolution"""
    id: int
    email: str
    full_name: Optional[str] = None


class ReleaseInfo(BaseModel):
    """Release info for context resolution"""
    id: int
    version: str
    name: Optional[str] = None
    status: Optional[str] = None


class NavigationContext(BaseModel):
    """Full context for LLM prompt building"""
    pages: List[NavigationTarget]
    current_user: UserInfo
    current_release: Optional[ReleaseInfo] = None
    modules: List[ModuleInfo]
    users: List[UserInfo]
    releases: List[ReleaseInfo]


# ============ Analytics Schemas ============

class DailyUsage(BaseModel):
    """Daily usage stats"""
    date: str
    query_count: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    avg_response_time: Optional[float] = None
    cached_queries: int = 0


class UserUsageStats(BaseModel):
    """Usage stats for a user"""
    user_id: int
    email: str
    full_name: Optional[str] = None
    query_count: int
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int


class IntentDistribution(BaseModel):
    """Distribution of intents"""
    intent: str
    count: int
    percentage: float


class RecentQuery(BaseModel):
    """A recent search query"""
    id: int
    user_email: str
    query: str
    intent: Optional[str] = None
    tokens: int
    confidence: Optional[float] = None
    created_at: datetime


class UsageStatsOverview(BaseModel):
    """Overview stats for analytics dashboard"""
    total_queries: int
    total_tokens: int
    avg_response_time: float
    cache_hit_rate: float


class UsageStatsResponse(BaseModel):
    """Full analytics response for super admin"""
    overview: UsageStatsOverview
    daily_usage: List[DailyUsage]
    top_users: List[UserUsageStats]
    intent_distribution: List[IntentDistribution]
    recent_queries: List[RecentQuery]


class UserStatsResponse(BaseModel):
    """User's own usage stats"""
    today: TokenUsage
    this_week: TokenUsage
    this_month: TokenUsage
    total_queries_today: int
    total_queries_month: int


class LLMSettings(BaseModel):
    """LLM configuration settings (visible to super admin)"""
    llm_model: str = Field(..., alias="model_name")
    temperature: float
    max_output_tokens: int
    cache_ttl_seconds: int
    min_confidence_threshold: float
    min_similarity_threshold: float = Field(default=0.3, description="Minimum similarity score (0.0-1.0) for semantic search results")
    max_results: int
    
    class Config:
        populate_by_name = True


class LLMSettingsUpdate(BaseModel):
    """Schema for updating LLM settings (super admin only)"""
    min_similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum similarity score for semantic search (0.0-1.0)")
    min_confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum confidence threshold for LLM classification")
    cache_ttl_seconds: Optional[int] = Field(None, ge=0, le=3600, description="Cache TTL in seconds (0-3600)")
    max_results: Optional[int] = Field(None, ge=1, le=100, description="Maximum results to return (1-100)")


class TokenUsageStatistics(BaseModel):
    """Token usage statistics for a time period"""
    period: str  # "day", "week", "month"
    period_start: datetime
    period_end: datetime
    total_queries: int
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    cached_queries: int
    cache_hit_rate: float
    avg_tokens_per_query: float
    avg_response_time_ms: float


class SmartSearchSettingsResponse(BaseModel):
    """Smart search settings response for super admin"""
    llm_settings: LLMSettings
    usage_today: TokenUsageStatistics
    usage_week: TokenUsageStatistics
    usage_month: TokenUsageStatistics
    can_edit: bool = False
