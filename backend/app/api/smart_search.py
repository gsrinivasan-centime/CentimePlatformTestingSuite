"""
Smart Search API Router
Endpoints for smart search functionality and usage analytics
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_super_admin
from app.models.models import User, SmartSearchLog
from app.schemas.smart_search import (
    SmartSearchRequest, SmartSearchResponse,
    UsageStatsResponse, UsageStatsOverview, DailyUsage,
    UserUsageStats, IntentDistribution, RecentQuery,
    UserStatsResponse, TokenUsage,
    SmartSearchSettingsResponse, LLMSettings, TokenUsageStatistics,
    LLMSettingsUpdate
)
from app.services.smart_search_service import smart_search_service

router = APIRouter()


@router.post("/smart", response_model=SmartSearchResponse)
async def smart_search(
    request: SmartSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a smart search query.
    
    The query is analyzed by an LLM to determine:
    - Which page to navigate to
    - What filters to apply
    - Whether semantic search is needed
    
    Returns navigation instructions and matching entity IDs.
    """
    return await smart_search_service.search(request, current_user, db)


@router.get("/usage-stats", response_model=UsageStatsResponse)
async def get_usage_stats(
    period: str = "month",  # day, week, month
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """
    Get smart search usage analytics (Super Admin only).
    
    Returns:
    - Overview statistics
    - Daily/weekly usage charts
    - Top users by token consumption
    - Intent distribution
    - Recent queries
    """
    # Determine date range
    now = datetime.utcnow()
    if start_date and end_date:
        date_from = datetime.fromisoformat(start_date)
        date_to = datetime.fromisoformat(end_date)
    elif period == "day":
        date_from = now - timedelta(days=1)
        date_to = now
    elif period == "week":
        date_from = now - timedelta(weeks=1)
        date_to = now
    else:  # month
        date_from = now - timedelta(days=30)
        date_to = now
    
    # Base query filter
    base_filter = SmartSearchLog.created_at.between(date_from, date_to)
    if user_id:
        base_filter = base_filter & (SmartSearchLog.user_id == user_id)
    
    # Overview stats
    overview_query = db.query(
        func.count(SmartSearchLog.id).label('total_queries'),
        func.sum(SmartSearchLog.input_tokens + SmartSearchLog.output_tokens).label('total_tokens'),
        func.avg(SmartSearchLog.response_time_ms).label('avg_response_time'),
        func.sum(func.cast(SmartSearchLog.cached, Integer)).label('cached_count')
    ).filter(base_filter).first()
    
    total_queries = overview_query.total_queries or 0
    cache_hit_rate = (overview_query.cached_count or 0) / total_queries * 100 if total_queries > 0 else 0
    
    overview = UsageStatsOverview(
        total_queries=total_queries,
        total_tokens=overview_query.total_tokens or 0,
        avg_response_time=float(overview_query.avg_response_time or 0),
        cache_hit_rate=cache_hit_rate
    )
    
    # Daily usage
    daily_query = db.query(
        func.date(SmartSearchLog.created_at).label('date'),
        func.count(SmartSearchLog.id).label('query_count'),
        func.sum(SmartSearchLog.input_tokens).label('input_tokens'),
        func.sum(SmartSearchLog.output_tokens).label('output_tokens'),
        func.avg(SmartSearchLog.response_time_ms).label('avg_response_time'),
        func.sum(func.cast(SmartSearchLog.cached, Integer)).label('cached_queries')
    ).filter(base_filter).group_by(
        func.date(SmartSearchLog.created_at)
    ).order_by(func.date(SmartSearchLog.created_at)).all()
    
    daily_usage = [
        DailyUsage(
            date=str(row.date),
            query_count=row.query_count,
            input_tokens=row.input_tokens or 0,
            output_tokens=row.output_tokens or 0,
            total_tokens=(row.input_tokens or 0) + (row.output_tokens or 0),
            avg_response_time=float(row.avg_response_time or 0),
            cached_queries=row.cached_queries or 0
        )
        for row in daily_query
    ]
    
    # Top users by token usage
    top_users_query = db.query(
        SmartSearchLog.user_id,
        User.email,
        User.full_name,
        func.count(SmartSearchLog.id).label('query_count'),
        func.sum(SmartSearchLog.input_tokens).label('total_input_tokens'),
        func.sum(SmartSearchLog.output_tokens).label('total_output_tokens')
    ).join(User).filter(base_filter).group_by(
        SmartSearchLog.user_id, User.email, User.full_name
    ).order_by(func.sum(SmartSearchLog.input_tokens + SmartSearchLog.output_tokens).desc()).limit(10).all()
    
    top_users = [
        UserUsageStats(
            user_id=row.user_id,
            email=row.email,
            full_name=row.full_name,
            query_count=row.query_count,
            total_input_tokens=row.total_input_tokens or 0,
            total_output_tokens=row.total_output_tokens or 0,
            total_tokens=(row.total_input_tokens or 0) + (row.total_output_tokens or 0)
        )
        for row in top_users_query
    ]
    
    # Intent distribution
    intent_query = db.query(
        SmartSearchLog.intent,
        func.count(SmartSearchLog.id).label('count')
    ).filter(base_filter).group_by(SmartSearchLog.intent).all()
    
    intent_total = sum(row.count for row in intent_query) or 1
    intent_distribution = [
        IntentDistribution(
            intent=row.intent or "unknown",
            count=row.count,
            percentage=round(row.count / intent_total * 100, 1)
        )
        for row in intent_query
    ]
    
    # Recent queries
    recent_query = db.query(
        SmartSearchLog.id,
        User.email.label('user_email'),
        SmartSearchLog.query,
        SmartSearchLog.intent,
        (SmartSearchLog.input_tokens + SmartSearchLog.output_tokens).label('tokens'),
        SmartSearchLog.confidence,
        SmartSearchLog.created_at
    ).join(User).filter(base_filter).order_by(
        SmartSearchLog.created_at.desc()
    ).limit(50).all()
    
    recent_queries = [
        RecentQuery(
            id=row.id,
            user_email=row.user_email,
            query=row.query,
            intent=row.intent,
            tokens=row.tokens or 0,
            confidence=row.confidence,
            created_at=row.created_at
        )
        for row in recent_query
    ]
    
    return UsageStatsResponse(
        overview=overview,
        daily_usage=daily_usage,
        top_users=top_users,
        intent_distribution=intent_distribution,
        recent_queries=recent_queries
    )


@router.get("/my-stats", response_model=UserStatsResponse)
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's search usage statistics.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Today's stats
    today_query = db.query(
        func.count(SmartSearchLog.id).label('count'),
        func.sum(SmartSearchLog.input_tokens).label('input'),
        func.sum(SmartSearchLog.output_tokens).label('output')
    ).filter(
        SmartSearchLog.user_id == current_user.id,
        SmartSearchLog.created_at >= today_start
    ).first()
    
    # This week's stats
    week_query = db.query(
        func.count(SmartSearchLog.id).label('count'),
        func.sum(SmartSearchLog.input_tokens).label('input'),
        func.sum(SmartSearchLog.output_tokens).label('output')
    ).filter(
        SmartSearchLog.user_id == current_user.id,
        SmartSearchLog.created_at >= week_start
    ).first()
    
    # This month's stats
    month_query = db.query(
        func.count(SmartSearchLog.id).label('count'),
        func.sum(SmartSearchLog.input_tokens).label('input'),
        func.sum(SmartSearchLog.output_tokens).label('output')
    ).filter(
        SmartSearchLog.user_id == current_user.id,
        SmartSearchLog.created_at >= month_start
    ).first()
    
    return UserStatsResponse(
        today=TokenUsage(
            input_tokens=today_query.input or 0,
            output_tokens=today_query.output or 0,
            total_tokens=(today_query.input or 0) + (today_query.output or 0)
        ),
        this_week=TokenUsage(
            input_tokens=week_query.input or 0,
            output_tokens=week_query.output or 0,
            total_tokens=(week_query.input or 0) + (week_query.output or 0)
        ),
        this_month=TokenUsage(
            input_tokens=month_query.input or 0,
            output_tokens=month_query.output or 0,
            total_tokens=(month_query.input or 0) + (month_query.output or 0)
        ),
        total_queries_today=today_query.count or 0,
        total_queries_month=month_query.count or 0
    )


# Need to import Integer for cast
from sqlalchemy import Integer


def _get_usage_statistics_for_period(
    db: Session,
    period_start: datetime,
    period_end: datetime,
    period_name: str
) -> TokenUsageStatistics:
    """Helper function to get token usage statistics for a time period"""
    stats = db.query(
        func.count(SmartSearchLog.id).label('total_queries'),
        func.coalesce(func.sum(SmartSearchLog.input_tokens), 0).label('total_input_tokens'),
        func.coalesce(func.sum(SmartSearchLog.output_tokens), 0).label('total_output_tokens'),
        func.coalesce(func.sum(func.cast(SmartSearchLog.cached, Integer)), 0).label('cached_queries'),
        func.coalesce(func.avg(SmartSearchLog.response_time_ms), 0).label('avg_response_time')
    ).filter(
        SmartSearchLog.created_at.between(period_start, period_end)
    ).first()
    
    total_queries = stats.total_queries or 0
    total_input_tokens = stats.total_input_tokens or 0
    total_output_tokens = stats.total_output_tokens or 0
    total_tokens = total_input_tokens + total_output_tokens
    cached_queries = stats.cached_queries or 0
    cache_hit_rate = (cached_queries / total_queries * 100) if total_queries > 0 else 0
    avg_tokens = (total_tokens / total_queries) if total_queries > 0 else 0
    
    return TokenUsageStatistics(
        period=period_name,
        period_start=period_start,
        period_end=period_end,
        total_queries=total_queries,
        total_input_tokens=total_input_tokens,
        total_output_tokens=total_output_tokens,
        total_tokens=total_tokens,
        cached_queries=cached_queries,
        cache_hit_rate=round(cache_hit_rate, 2),
        avg_tokens_per_query=round(avg_tokens, 2),
        avg_response_time_ms=round(float(stats.avg_response_time or 0), 2)
    )


@router.get("/settings", response_model=SmartSearchSettingsResponse)
async def get_smart_search_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get smart search settings and token usage statistics.
    
    Visible to all authenticated users in read-only mode.
    Only super admins can edit (can_edit flag).
    
    Returns:
    - LLM model configuration
    - Token usage for today, this week, and this month
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Get LLM settings with values from database
    llm_settings_dict = smart_search_service.get_llm_settings(db)
    llm_settings = LLMSettings(**llm_settings_dict)
    
    # Get usage statistics for each period
    usage_today = _get_usage_statistics_for_period(db, today_start, now, "day")
    usage_week = _get_usage_statistics_for_period(db, week_start, now, "week")
    usage_month = _get_usage_statistics_for_period(db, month_start, now, "month")
    
    return SmartSearchSettingsResponse(
        llm_settings=llm_settings,
        usage_today=usage_today,
        usage_week=usage_week,
        usage_month=usage_month,
        can_edit=getattr(current_user, 'is_super_admin', False)
    )


@router.put("/settings", response_model=dict)
async def update_smart_search_settings(
    settings: LLMSettingsUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """
    Update smart search settings (Super Admin only).
    
    Configurable settings:
    - min_similarity_threshold: Minimum similarity score for semantic search (0.0-1.0)
    - min_confidence_threshold: Minimum confidence for LLM classification (0.0-1.0)
    - cache_ttl_seconds: Cache TTL in seconds
    - max_results: Maximum results to return
    """
    # Convert pydantic model to dict, excluding None values
    settings_dict = settings.model_dump(exclude_none=True)
    
    if not settings_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No settings provided to update"
        )
    
    success = smart_search_service.update_settings(db, settings_dict)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )
    
    return {
        "success": True,
        "message": "Settings updated successfully",
        "updated_settings": settings_dict
    }

