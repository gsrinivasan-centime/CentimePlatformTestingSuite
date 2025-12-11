"""
Production Tickets API
Fetches production tickets from JIRA (CN-XXXX with "BO" label) - read-only, no local storage
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional, List
from datetime import datetime, timedelta
from cachetools import TTLCache
import threading
import base64
import urllib.parse

from app.api.auth import get_current_user
from app.models.models import User
from app.services.jira_service import jira_service

router = APIRouter()

# Thread-safe caches with TTL
# Ticket list cache: 5 minutes
ticket_list_cache = TTLCache(maxsize=100, ttl=300)
# Ticket details cache: 5 minutes
ticket_details_cache = TTLCache(maxsize=200, ttl=300)
# Comments cache: 2 minutes (more frequently updated)
comments_cache = TTLCache(maxsize=200, ttl=120)
cache_lock = threading.Lock()

# Track last cache update time
cache_metadata = {
    "last_updated": None
}


def get_jql_for_status(status: str) -> str:
    """Convert status filter to JIRA JQL status condition"""
    status_mapping = {
        "open": '"Open"',
        "in_progress": '"In Progress"',
        "pending_verification": '"Pending Verification"',
        "closed": '"Closed"'
    }
    return status_mapping.get(status.lower(), '"Open"')


def get_date_filter_jql(period: str) -> str:
    """Generate JQL date filter based on period"""
    today = datetime.now()
    
    if period == "current_month":
        # Start of current month
        start_date = today.replace(day=1).strftime("%Y-%m-%d")
        return f' AND created >= "{start_date}"'
    elif period == "last_month":
        # Start and end of last month
        first_of_current = today.replace(day=1)
        last_of_previous = first_of_current - timedelta(days=1)
        first_of_previous = last_of_previous.replace(day=1)
        return f' AND created >= "{first_of_previous.strftime("%Y-%m-%d")}" AND created <= "{last_of_previous.strftime("%Y-%m-%d")}"'
    
    return ""  # No date filter for "all"


@router.get("")
@router.get("/")
async def get_production_tickets(
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, pending_verification, closed"),
    period: Optional[str] = Query(None, description="Filter by period: current_month, last_month, all"),
    ticket_number: Optional[str] = Query(None, description="Search by specific ticket number (CN-XXXX)"),
    exclude_statuses: Optional[str] = Query(None, description="Comma-separated list of statuses to exclude (e.g., 'Cancelled,Resolved')"),
    exclude_unassigned: Optional[bool] = Query(None, description="Exclude tickets without an assignee"),
    current_user: User = Depends(get_current_user)
):
    """
    Get production tickets from JIRA
    
    - Filters by project CN and label "BO"
    - Supports status filter (Open, In Progress, Pending Verification, Closed)
    - Supports date period filter (current month, last month)
    - Supports specific ticket number search
    - Supports excluding specific statuses (comma-separated)
    - Supports excluding unassigned tickets
    - Results are cached for 5 minutes
    """
    if not jira_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="JIRA integration is not configured. Please set JIRA_SERVER, JIRA_EMAIL, and JIRA_API_TOKEN."
        )
    
    # Build cache key
    cache_key = f"tickets:{status}:{period}:{ticket_number}:{exclude_statuses}:{exclude_unassigned}"
    
    # Check cache
    with cache_lock:
        if cache_key in ticket_list_cache:
            cached_result = ticket_list_cache[cache_key]
            return {
                "tickets": cached_result["tickets"],
                "total": len(cached_result["tickets"]),
                "cached": True,
                "cache_updated_at": cached_result.get("updated_at")
            }
    
    try:
        # Build JQL query
        # Base: project = CN AND labels = BO
        jql_parts = ['project = CN', 'labels = "BO"']
        
        # Add status filter
        if status:
            if status.lower() == "closed":
                jql_parts.append('status = "Closed"')
            else:
                status_jql = get_jql_for_status(status)
                jql_parts.append(f'status = {status_jql}')
        else:
            # Default: show non-closed tickets
            jql_parts.append('status != "Closed"')
        
        # Add exclude statuses filter (NOT IN)
        if exclude_statuses:
            excluded_list = [s.strip() for s in exclude_statuses.split(',') if s.strip()]
            if excluded_list:
                excluded_jql = ', '.join([f'"{s}"' for s in excluded_list])
                jql_parts.append(f'status NOT IN ({excluded_jql})')
        
        # Add exclude unassigned filter
        if exclude_unassigned:
            jql_parts.append('assignee IS NOT EMPTY')
        
        # Add date filter
        if period:
            date_jql = get_date_filter_jql(period)
            if date_jql:
                jql_parts.append(date_jql.strip().replace(" AND ", ""))
        
        # Add specific ticket search
        if ticket_number:
            # Support partial match - CN-1234 or just 1234
            if ticket_number.upper().startswith("CN-"):
                jql_parts.append(f'key = "{ticket_number.upper()}"')
            else:
                jql_parts.append(f'key = "CN-{ticket_number}"')
        
        jql = " AND ".join(jql_parts)
        jql += " ORDER BY updated DESC"
        
        # Fetch from JIRA
        tickets = jira_service.search_production_tickets(jql)
        
        # Update cache
        now = datetime.now().isoformat()
        with cache_lock:
            ticket_list_cache[cache_key] = {
                "tickets": tickets,
                "updated_at": now
            }
            cache_metadata["last_updated"] = now
        
        return {
            "tickets": tickets,
            "total": len(tickets),
            "cached": False,
            "cache_updated_at": now
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tickets from JIRA: {str(e)}")


@router.get("/stats")
async def get_production_ticket_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get production ticket statistics by status
    Returns counts for Open, In Progress, Pending Verification, and Closed tickets
    """
    if not jira_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="JIRA integration is not configured."
        )
    
    cache_key = "stats"
    
    with cache_lock:
        if cache_key in ticket_list_cache:
            return ticket_list_cache[cache_key]
    
    try:
        stats = {
            "open": 0,
            "in_progress": 0,
            "pending_verification": 0,
            "closed_this_month": 0
        }
        
        # Get counts for each status
        base_jql = 'project = CN AND labels = "BO"'
        
        # Open tickets
        stats["open"] = jira_service.get_ticket_count(f'{base_jql} AND status = "Open"')
        
        # In Progress tickets
        stats["in_progress"] = jira_service.get_ticket_count(f'{base_jql} AND status = "In Progress"')
        
        # Pending Verification tickets
        stats["pending_verification"] = jira_service.get_ticket_count(f'{base_jql} AND status = "Pending Verification"')
        
        # Closed this month
        today = datetime.now()
        start_of_month = today.replace(day=1).strftime("%Y-%m-%d")
        stats["closed_this_month"] = jira_service.get_ticket_count(
            f'{base_jql} AND status = "Closed" AND resolved >= "{start_of_month}"'
        )
        
        # Cache the stats
        with cache_lock:
            ticket_list_cache[cache_key] = stats
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/proxy/image")
async def proxy_jira_image(
    url: str = Query(..., description="Base64-encoded JIRA image URL")
):
    """
    Proxy a JIRA image with authentication.
    The URL should be base64-encoded to handle special characters.
    Note: This endpoint doesn't require user auth since browser img tags can't send headers.
    Security is maintained by only allowing URLs from the configured JIRA server.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[proxy/image] Received URL param: {url[:100]}...")
        
        # Handle URL-encoded base64 (browsers may encode + as %2B, / as %2F)
        # First URL-decode, then base64 decode
        url_decoded = urllib.parse.unquote(url)
        
        # Try standard base64 decode first
        try:
            decoded_url = base64.b64decode(url_decoded).decode('utf-8')
        except Exception as e1:
            logger.warning(f"[proxy/image] Standard base64 decode failed: {e1}")
            # Try URL-safe base64 decode (replaces - with + and _ with /)
            url_safe = url_decoded.replace('-', '+').replace('_', '/')
            # Add padding if necessary
            padding = 4 - len(url_safe) % 4
            if padding != 4:
                url_safe += '=' * padding
            decoded_url = base64.b64decode(url_safe).decode('utf-8')
        
        logger.info(f"[proxy/image] Decoded URL: {decoded_url}")
        
        # Fetch the image through the JIRA service
        image_data, content_type = jira_service.proxy_image(decoded_url)
        
        logger.info(f"[proxy/image] Successfully fetched image, size: {len(image_data)} bytes, type: {content_type}")
        
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                "Content-Disposition": "inline",
                "Access-Control-Allow-Origin": "*"
            }
        )
        
    except ValueError as e:
        logger.error(f"[proxy/image] ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[proxy/image] Exception: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch image: {str(e)}")


@router.get("/{ticket_key}")
async def get_ticket_details(
    ticket_key: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information for a specific ticket including description (ADF format)
    """
    if not jira_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="JIRA integration is not configured."
        )
    
    # Normalize ticket key
    ticket_key = ticket_key.upper()
    if not ticket_key.startswith("CN-"):
        ticket_key = f"CN-{ticket_key}"
    
    cache_key = f"details:{ticket_key}"
    
    with cache_lock:
        if cache_key in ticket_details_cache:
            return ticket_details_cache[cache_key]
    
    try:
        details = jira_service.get_production_ticket_details(ticket_key)
        
        with cache_lock:
            ticket_details_cache[cache_key] = details
        
        return details
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ticket details: {str(e)}")


@router.get("/{ticket_key}/comments")
async def get_ticket_comments(
    ticket_key: str,
    start_at: int = Query(0, ge=0, description="Starting index for pagination"),
    max_results: int = Query(10, ge=1, le=50, description="Maximum results per page"),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated comments for a ticket, ordered by newest first
    """
    if not jira_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="JIRA integration is not configured."
        )
    
    # Normalize ticket key
    ticket_key = ticket_key.upper()
    if not ticket_key.startswith("CN-"):
        ticket_key = f"CN-{ticket_key}"
    
    cache_key = f"comments:{ticket_key}:{start_at}:{max_results}"
    
    with cache_lock:
        if cache_key in comments_cache:
            return comments_cache[cache_key]
    
    try:
        result = jira_service.get_ticket_comments(ticket_key, start_at, max_results)
        
        with cache_lock:
            comments_cache[cache_key] = result
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch comments: {str(e)}")


@router.post("/refresh")
async def refresh_cache(
    current_user: User = Depends(get_current_user)
):
    """
    Clear all caches to force fresh data on next request
    """
    with cache_lock:
        ticket_list_cache.clear()
        ticket_details_cache.clear()
        comments_cache.clear()
        cache_metadata["last_updated"] = None
    
    return {"message": "Cache cleared successfully", "cleared_at": datetime.now().isoformat()}

