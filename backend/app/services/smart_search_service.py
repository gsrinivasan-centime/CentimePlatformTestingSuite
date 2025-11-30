"""
Smart Search Service
Main service for handling smart search queries with LLM classification,
hybrid search (SQL + vector), and token tracking.
"""
import logging
import json
import time
import hashlib
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from functools import lru_cache

import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text

from app.core.config import settings
from app.models.models import (
    User, TestCase, Issue, JiraStory, Module, Release,
    SmartSearchLog
)
from app.schemas.smart_search import (
    SmartSearchRequest, SmartSearchResponse, LLMClassificationResult,
    NavigationSuggestion, TokenUsage, SearchIntent
)
from app.services.navigation_registry import navigation_registry_service
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

# Configuration - Default values (can be overridden by database settings)
GOOGLE_API_KEY = getattr(settings, 'GOOGLE_API_KEY', None) or "AIzaSyA-Rd4mfopLyFp5_MwKvBn9CrLPfMs5-Mg"
GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_MIN_CONFIDENCE_THRESHOLD = 0.5
DEFAULT_MIN_SIMILARITY_THRESHOLD = 0.5  # Minimum 50% similarity for semantic search results
DEFAULT_MAX_RESULTS = 50
DEFAULT_LLM_CACHE_TTL = 60  # 1 minute cache for identical queries

# Stop words for keyword extraction
STOP_WORDS = {
    'show', 'me', 'all', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'of',
    'with', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'get', 'find', 'list', 'display', 'view', 'see', 'give', 'that', 'this',
    'those', 'these', 'there', 'where', 'what', 'which', 'who', 'whom',
    'whose', 'when', 'why', 'how', 'any', 'some', 'related', 'about'
}


class SmartSearchService:
    """Main service for smart search functionality"""
    
    def __init__(self):
        self._model = None
        self._embedding_service = None
        self._llm_cache: Dict[str, Tuple[Any, float]] = {}
        self._settings_cache: Dict[str, Tuple[Any, float]] = {}
        self._settings_cache_ttl = 300  # 5 minutes cache for settings
        self._initialize()
    
    def _initialize(self):
        """Initialize Gemini model"""
        try:
            genai.configure(api_key=GOOGLE_API_KEY)
            self._model = genai.GenerativeModel(GEMINI_MODEL)
            logger.info(f"Initialized Gemini model: {GEMINI_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            self._model = None
    
    def _get_setting(self, db: Session, key: str, default: Any) -> Any:
        """Get a setting value from database with caching"""
        from app.models.models import ApplicationSetting
        
        cache_key = f"setting:{key}"
        if cache_key in self._settings_cache:
            value, timestamp = self._settings_cache[cache_key]
            if time.time() - timestamp < self._settings_cache_ttl:
                return value
        
        try:
            setting = db.query(ApplicationSetting).filter(
                ApplicationSetting.key == key
            ).first()
            if setting:
                # Parse value based on type
                value = setting.value
                if isinstance(default, float):
                    value = float(value)
                elif isinstance(default, int):
                    value = int(value)
                self._settings_cache[cache_key] = (value, time.time())
                return value
        except Exception as e:
            logger.warning(f"Failed to get setting {key}: {e}")
        
        return default
    
    def _get_min_similarity_threshold(self, db: Session) -> float:
        """Get minimum similarity threshold from settings"""
        return self._get_setting(db, "smart_search_min_similarity", DEFAULT_MIN_SIMILARITY_THRESHOLD)
    
    def _get_min_confidence_threshold(self, db: Session) -> float:
        """Get minimum confidence threshold from settings"""
        return self._get_setting(db, "smart_search_min_confidence", DEFAULT_MIN_CONFIDENCE_THRESHOLD)
    
    def _get_max_results(self, db: Session) -> int:
        """Get max results from settings"""
        return self._get_setting(db, "smart_search_max_results", DEFAULT_MAX_RESULTS)
    
    def _get_cache_ttl(self, db: Session) -> int:
        """Get cache TTL from settings"""
        return self._get_setting(db, "smart_search_cache_ttl", DEFAULT_LLM_CACHE_TTL)
    
    def _get_embedding_service(self) -> EmbeddingService:
        """Lazy load embedding service"""
        if self._embedding_service is None:
            self._embedding_service = EmbeddingService()
        return self._embedding_service
    
    def _get_cache_key(self, query: str, user_id: int) -> str:
        """Generate cache key for LLM response"""
        return hashlib.md5(f"{query}:{user_id}".encode()).hexdigest()
    
    def _get_from_llm_cache(self, key: str, cache_ttl: int) -> Optional[LLMClassificationResult]:
        """Get LLM response from cache if valid"""
        if key in self._llm_cache:
            result, timestamp = self._llm_cache[key]
            if time.time() - timestamp < cache_ttl:
                return result
            else:
                del self._llm_cache[key]
        return None
    
    def _set_llm_cache(self, key: str, result: LLMClassificationResult, cache_ttl: int):
        """Cache LLM response"""
        self._llm_cache[key] = (result, time.time())
        # Clean old entries
        current_time = time.time()
        self._llm_cache = {
            k: v for k, v in self._llm_cache.items()
            if current_time - v[1] < cache_ttl
        }
    
    def _build_llm_prompt(self, query: str, context) -> str:
        """Build the prompt for LLM classification"""
        # Build pages description
        pages_desc = []
        for page in context.pages:
            filters_str = ", ".join([f.field for f in page.filters]) if page.filters else "none"
            searchable_str = ", ".join(page.searchable_fields) if page.searchable_fields else "none"
            pages_desc.append(
                f"- {page.display_name} ({page.path})\n"
                f"  Entity: {page.entity_type or 'N/A'}\n"
                f"  Filters: {filters_str}\n"
                f"  Semantic search fields: {searchable_str}\n"
                f"  Examples: {', '.join(page.example_queries[:2]) if page.example_queries else 'N/A'}"
            )
        
        # Build modules description
        modules_desc = ", ".join([
            f"{m.name} (ID:{m.id}, aliases: {','.join(m.aliases)})" 
            for m in context.modules
        ])
        
        # Build users description
        users_desc = ", ".join([
            f"{u.full_name or u.email} (ID:{u.id})"
            for u in context.users[:10]  # Limit to 10 users
        ])
        
        # Build releases description with current/previous markers
        current_release = context.current_release
        current_release_id = current_release.id if current_release else None
        
        releases_list = []
        previous_release_id = None
        previous_release_str = "None"
        for i, r in enumerate(context.releases[:5]):
            if r.id == current_release_id:
                releases_list.append(f"{r.version} (ID:{r.id}, CURRENT)")
                # The next release in the list is the previous one
                if i + 1 < len(context.releases):
                    prev_r = context.releases[i + 1]
                    previous_release_id = prev_r.id
                    previous_release_str = f"{prev_r.version} (ID:{prev_r.id})"
            else:
                releases_list.append(f"{r.version} (ID:{r.id})")
        releases_desc = ", ".join(releases_list)
        
        current_release_str = f"{current_release.version} (ID:{current_release.id})" if current_release else "None"
        
        prompt = f"""You are a smart search assistant for a QA Portal application. Analyze the user query and determine:
1. Which page/section they want to navigate to
2. What filters to apply
3. Whether semantic search is needed for finding specific content

AVAILABLE PAGES:
- Test Cases (/test-cases) - List and search test cases, filter by module_id, tag, test_type
- Test Design Studio (/test-design-studio) - Create new test cases with BDD/Gherkin format, design tests
- Issues (/issues) - List and search issues/bugs, filter by module_id, severity, status, assigned_to
- Stories (/stories) - List JIRA stories, filter by status, assignee
- Releases (/releases) - List all releases
- Release Dashboard (/releases/ID) - View release progress, testing status, metrics for a specific release
- Dashboard (/dashboard) - Main overview dashboard
- Modules (/modules) - List application modules
- Reports (/reports) - View test execution reports
- Execute Tests (/executions) - Run test executions, execute test cases

CONTEXT:
- Current User: {context.current_user.full_name} ({context.current_user.email}, ID:{context.current_user.id})
- Current/Active Release: {current_release_str}
- Previous Release: {previous_release_str}
- Available Modules: {modules_desc}
- Available Users: {users_desc}
- Available Releases: {releases_desc}

FILTER VALUES - Use these EXACT values in filters:
- module_id: Use the numeric ID from Available Modules above (e.g., 1 for Account Payables)
- tag: "ui", "api", "hybrid" ONLY (lowercase) - these describe how the test is executed
- test_type: "manual", "automated"
- status: "open", "in_progress", "resolved", "closed"
- severity: "critical", "major", "minor", "trivial"
- priority: "p0", "p1", "p2", "p3"

NOTE: "smoke", "regression", "sanity", "functional" are NOT valid tags. Use semantic search for these test category keywords.

SPECIAL TOKENS TO RESOLVE:
- "me", "my", "assigned to me" → Use user ID {context.current_user.id}
- "current release", "this release", "active release" → Use current release ID {current_release.id if current_release else 'N/A'}
- "previous release", "last release", "prior release" → Use previous release ID {previous_release_id if previous_release_id else 'N/A'}
- "progress", "status", "overview", "metrics" for a release → Navigate to Release Dashboard
- Module abbreviations: AP=Account Payable, AR=Account Receivables, etc.

RELEASE-SPECIFIC VIEWS - IMPORTANT:
- "stories of release X", "stories in release X", "release X stories" → Use intent "view_release_stories" with target_page "/releases/ID?tab=stories"
- "issues of release X", "issues in release X", "release X issues" → Use intent "view_release_issues" with target_page "/releases/ID?tab=issues"
- Replace ID with the actual release ID number

USER QUERY: "{query}"

Analyze the query and respond with ONLY valid JSON (no markdown, no explanation):
{{
  "intent": "view_test_cases|view_test_design_studio|view_issues|view_stories|view_release|view_release_dashboard|view_release_stories|view_release_issues|view_modules|view_dashboard|view_executions|unknown",
  "target_page": "/test-cases or /test-design-studio or /issues or /stories or /releases or /releases/ID or /dashboard or /modules or /reports or /executions",
  "filters": {{"field_name": "value"}},
  "requires_semantic_search": true|false,
  "semantic_query": "keywords for vector search or null",
  "confidence": 0.0 to 1.0
}}

CRITICAL RULES:
1. Use EXACTLY these paths with hyphens: /test-cases, /test-design-studio, /issues, /stories, /releases, /dashboard, /modules, /reports, /executions
2. For release dashboard/progress/status queries, use "/releases/{current_release.id if current_release else '1'}" with intent "view_release_dashboard"
3. For "assigned to me", set filters.assigned_to = {context.current_user.id}
4. For "current release", use the current release ID: {current_release.id if current_release else 'null'}
5. For "create test", "design test", "new test case", "write test", "BDD", "Gherkin" → Navigate to Test Design Studio (/test-design-studio)
6. For "run tests", "execute tests", "test execution" → Navigate to Executions (/executions)

FILTER vs SEMANTIC SEARCH - VERY IMPORTANT:
7. "UI", "API", "smoke", "regression" test cases → These are TAG FILTERS, use filters.tag="ui"|"api"|"smoke"|"regression"
8. "manual" or "automated" test cases → These are TYPE FILTERS, use filters.test_type="manual"|"automated"
9. Only use requires_semantic_search=true for specific content search by title/description keywords (e.g., "tests about invoice processing", "login validation")
10. When user says "UI related" or "API tests", set tag filter, NOT semantic search

11. confidence should be HIGH (0.8-1.0) when the intent is clear
12. Always use module_id with the NUMERIC ID, not the module name
"""
        return prompt
    
    async def _classify_query(
        self, 
        query: str, 
        user: User, 
        db: Session
    ) -> Tuple[LLMClassificationResult, TokenUsage]:
        """Classify the query using Gemini LLM"""
        # Get cache TTL from settings
        cache_ttl = self._get_cache_ttl(db)
        
        # Check cache first
        cache_key = self._get_cache_key(query, user.id)
        cached_result = self._get_from_llm_cache(cache_key, cache_ttl)
        if cached_result:
            logger.info(f"[Smart Search] Cache hit for query: {query[:50]}...")
            return cached_result, TokenUsage(input_tokens=0, output_tokens=0, total_tokens=0)
        
        if not self._model:
            logger.error("[Smart Search] Gemini model not initialized")
            return self._fallback_classification(query), TokenUsage()
        
        # Get context from navigation registry
        context = navigation_registry_service.get_full_context(db, user)
        prompt = self._build_llm_prompt(query, context)
        
        try:
            response = self._model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=500
                )
            )
            
            # Extract token usage
            token_usage = TokenUsage(
                input_tokens=response.usage_metadata.prompt_token_count,
                output_tokens=response.usage_metadata.candidates_token_count,
                total_tokens=response.usage_metadata.total_token_count
            )
            
            # Parse response
            if not response.candidates or not response.candidates[0].content.parts:
                logger.warning("[Smart Search] Empty response from Gemini")
                return self._fallback_classification(query), token_usage
            
            response_text = response.text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
            
            # Parse JSON
            result_dict = json.loads(response_text)
            result = LLMClassificationResult(
                intent=result_dict.get("intent", "unknown"),
                target_page=result_dict.get("target_page", "/dashboard"),
                filters=result_dict.get("filters", {}),
                requires_semantic_search=result_dict.get("requires_semantic_search", False),
                semantic_query=result_dict.get("semantic_query"),
                confidence=result_dict.get("confidence", 0.5)
            )
            
            # Cache the result
            self._set_llm_cache(cache_key, result, cache_ttl)
            
            logger.info(f"[Smart Search] Classified: intent={result.intent}, confidence={result.confidence}")
            return result, token_usage
            
        except json.JSONDecodeError as e:
            logger.error(f"[Smart Search] Failed to parse LLM response: {e}")
            return self._fallback_classification(query), TokenUsage()
        except Exception as e:
            logger.error(f"[Smart Search] LLM classification error: {e}")
            return self._fallback_classification(query), TokenUsage()
    
    def _fallback_classification(self, query: str) -> LLMClassificationResult:
        """Fallback classification when LLM fails"""
        query_lower = query.lower()
        
        # Check for release progress/status queries first (higher priority)
        if any(w in query_lower for w in ['progress', 'status', 'overview', 'metrics', 'how many']) and \
           any(w in query_lower for w in ['release', 'testing', 'current']):
            return LLMClassificationResult(
                intent="view_release_dashboard",
                target_page="/releases/1",  # Default to first release, will be overridden
                filters={},
                requires_semantic_search=False,
                confidence=0.7
            )
        
        # Simple keyword-based detection
        if any(w in query_lower for w in ['test case', 'test cases', 'tests']):
            return LLMClassificationResult(
                intent="view_test_cases",
                target_page="/test-cases",
                filters={},
                requires_semantic_search=True,
                semantic_query=query,
                confidence=0.6
            )
        elif any(w in query_lower for w in ['issue', 'issues', 'bug', 'bugs', 'defect']):
            return LLMClassificationResult(
                intent="view_issues",
                target_page="/issues",
                filters={},
                requires_semantic_search=True,
                semantic_query=query,
                confidence=0.6
            )
        elif any(w in query_lower for w in ['story', 'stories', 'user story']):
            return LLMClassificationResult(
                intent="view_stories",
                target_page="/stories",
                filters={},
                requires_semantic_search=False,
                confidence=0.6
            )
        elif any(w in query_lower for w in ['release']):
            return LLMClassificationResult(
                intent="view_release",
                target_page="/releases",
                filters={},
                requires_semantic_search=False,
                confidence=0.6
            )
        elif any(w in query_lower for w in ['dashboard', 'home', 'main']):
            return LLMClassificationResult(
                intent="view_dashboard",
                target_page="/dashboard",
                filters={},
                requires_semantic_search=False,
                confidence=0.7
            )
        else:
            return LLMClassificationResult(
                intent="unknown",
                target_page="/dashboard",
                filters={},
                requires_semantic_search=False,
                confidence=0.2
            )
    
    def _execute_structured_search(
        self,
        db: Session,
        entity_type: str,
        filters: Dict[str, Any],
        limit: int = DEFAULT_MAX_RESULTS
    ) -> List[int]:
        """Execute SQL-based structured search"""
        if entity_type == "test_case":
            query = db.query(TestCase.id)
            # Handle both 'module' and 'module_id' filter names
            module_filter = filters.get("module_id") or filters.get("module")
            if module_filter:
                # Check if it's a number (ID) or string (name)
                if isinstance(module_filter, int) or (isinstance(module_filter, str) and module_filter.isdigit()):
                    query = query.filter(TestCase.module_id == int(module_filter))
                else:
                    # It's a module name, look up the ID
                    module = db.query(Module).filter(
                        func.lower(Module.name).like(f"%{str(module_filter).lower()}%")
                    ).first()
                    if module:
                        logger.info(f"[Smart Search] Resolved module name '{module_filter}' to ID {module.id}")
                        query = query.filter(TestCase.module_id == module.id)
                    else:
                        logger.warning(f"[Smart Search] Could not resolve module name: {module_filter}")
            # Handle tag filter - validate against enum and normalize to lowercase
            tag = filters.get("tag")
            if tag:
                tag_lower = tag.lower() if isinstance(tag, str) else str(tag).lower()
                # Only apply tag filter if it's a valid TestTag enum value
                valid_tags = {'ui', 'api', 'hybrid'}
                if tag_lower in valid_tags:
                    logger.info(f"[Smart Search] Applying tag filter: {tag_lower}")
                    query = query.filter(TestCase.tag == tag_lower)
                else:
                    logger.warning(f"[Smart Search] Invalid tag '{tag_lower}', ignoring filter. Valid tags: {valid_tags}")
            if filters.get("test_type"):
                test_type = filters["test_type"]
                test_type_lower = test_type.lower() if isinstance(test_type, str) else test_type
                query = query.filter(TestCase.test_type == test_type_lower)
            if filters.get("jira_story_id"):
                query = query.filter(TestCase.jira_story_id == filters["jira_story_id"])
            if filters.get("sub_module"):
                query = query.filter(TestCase.sub_module.ilike(f"%{filters['sub_module']}%"))
            results = query.limit(limit).all()
            return [r[0] for r in results]
        
        elif entity_type == "issue":
            query = db.query(Issue.id)
            # Handle both 'module' and 'module_id' filter names
            module_id = filters.get("module_id") or filters.get("module")
            if module_id:
                query = query.filter(Issue.module_id == module_id)
            if filters.get("release_id"):
                query = query.filter(Issue.release_id == filters["release_id"])
            if filters.get("assigned_to"):
                query = query.filter(Issue.assigned_to == filters["assigned_to"])
            if filters.get("status"):
                query = query.filter(Issue.status == filters["status"])
            if filters.get("severity"):
                query = query.filter(Issue.severity == filters["severity"])
            if filters.get("priority"):
                query = query.filter(Issue.priority == filters["priority"])
            results = query.limit(limit).all()
            return [r[0] for r in results]
        
        elif entity_type == "jira_story":
            query = db.query(JiraStory.id)
            if filters.get("status"):
                query = query.filter(JiraStory.status == filters["status"])
            if filters.get("release"):
                query = query.filter(JiraStory.release == filters["release"])
            if filters.get("assignee"):
                query = query.filter(JiraStory.assignee.ilike(f"%{filters['assignee']}%"))
            results = query.limit(limit).all()
            return [r[0] for r in results]
        
        return []
    
    def _execute_semantic_search(
        self,
        db: Session,
        entity_type: str,
        query_text: str,
        pre_filter_ids: Optional[List[int]] = None,
        limit: int = DEFAULT_MAX_RESULTS,
        min_similarity: float = DEFAULT_MIN_SIMILARITY_THRESHOLD
    ) -> List[Tuple[int, float]]:
        """Execute vector-based semantic search with similarity threshold"""
        embedding_service = self._get_embedding_service()
        
        # Generate query embedding
        query_embedding = embedding_service.generate_embedding(query_text)
        if query_embedding is None:
            return []
        
        if entity_type == "test_case":
            # Use pgvector similarity search with minimum similarity threshold
            results = embedding_service.similarity_search(
                db=db,
                query_embedding=query_embedding,
                top_k=limit,
                filter_ids=pre_filter_ids,
                min_similarity=min_similarity
            )
            return results
        
        elif entity_type == "issue":
            # For issues, use the embedding column if it exists
            # Otherwise fall back to keyword search
            try:
                embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
                
                # Build filter clause
                filter_clause = ""
                params = {"limit": limit, "min_similarity": min_similarity}
                if pre_filter_ids:
                    filter_clause = "AND id = ANY(:filter_ids)"
                    params["filter_ids"] = pre_filter_ids
                
                # Use string formatting for the vector literal (it's safe since it's generated from floats)
                # Cast embedding array to vector type for pgvector operator
                sql = text(f"""
                    SELECT id, 1 - (embedding::vector <=> '{embedding_str}'::vector) as similarity
                    FROM issues
                    WHERE embedding IS NOT NULL
                    {filter_clause}
                    AND (1 - (embedding::vector <=> '{embedding_str}'::vector)) >= :min_similarity
                    ORDER BY embedding::vector <=> '{embedding_str}'::vector
                    LIMIT :limit
                """)
                result = db.execute(sql, params)
                return [(row[0], row[1]) for row in result.fetchall()]
            except Exception as e:
                logger.warning(f"[Smart Search] Issue semantic search failed: {e}")
                # Rollback the failed transaction
                try:
                    db.rollback()
                except Exception:
                    pass
                return []
        
        return []
    
    def _hybrid_search(
        self,
        db: Session,
        entity_type: str,
        filters: Dict[str, Any],
        semantic_query: Optional[str],
        limit: int = DEFAULT_MAX_RESULTS,
        min_similarity: float = DEFAULT_MIN_SIMILARITY_THRESHOLD
    ) -> List[int]:
        """Execute hybrid search combining structured and semantic"""
        # Check if there are actual filters (not just empty dict)
        has_filters = bool(filters) and any(v is not None for v in filters.values())
        
        if has_filters:
            # First, execute structured search to get filtered IDs
            filtered_ids = self._execute_structured_search(db, entity_type, filters, limit=200)
            
            if not semantic_query:
                # No semantic search needed, return structured results
                return filtered_ids[:limit]
            
            if filtered_ids:
                # Apply semantic ranking on filtered results
                semantic_results = self._execute_semantic_search(
                    db, entity_type, semantic_query, filtered_ids, limit, min_similarity
                )
                if semantic_results:
                    return [r[0] for r in semantic_results]
            
            return filtered_ids[:limit]
        else:
            # No structured filters, do pure semantic search
            if semantic_query:
                semantic_results = self._execute_semantic_search(
                    db, entity_type, semantic_query, None, limit, min_similarity
                )
                return [r[0] for r in semantic_results]
            else:
                # No filters and no semantic query - this shouldn't happen but return empty
                logger.warning("[Smart Search] Hybrid search called with no filters and no semantic query")
                return []
    
    def _build_query_params(
        self,
        classification: LLMClassificationResult,
        entity_ids: List[int]
    ) -> Dict[str, str]:
        """Build URL query parameters from classification result"""
        params = {}
        
        # Add filters
        for key, value in classification.filters.items():
            if value is not None:
                params[key] = str(value)
        
        # Add search query if semantic
        if classification.semantic_query:
            params["search"] = classification.semantic_query
        
        # Add entity IDs if found
        if entity_ids:
            params["ids"] = ",".join(map(str, entity_ids[:50]))  # Limit to 50 IDs in URL
        
        return params
    
    def _get_entity_type(self, intent: str) -> Optional[str]:
        """Map intent to entity type"""
        mapping = {
            "view_test_cases": "test_case",
            "view_issues": "issue",
            "view_release_issues": "issue",
            "view_stories": "jira_story",
            "view_release_stories": "jira_story",
        }
        return mapping.get(intent)
    
    def _build_suggestions(self, query: str) -> List[NavigationSuggestion]:
        """Build navigation suggestions for low-confidence results"""
        return [
            NavigationSuggestion(
                label="Search in Test Cases",
                path="/test-cases",
                query=query
            ),
            NavigationSuggestion(
                label="Search in Issues",
                path="/issues",
                query=query
            ),
            NavigationSuggestion(
                label="Search in Stories",
                path="/stories",
                query=query
            ),
            NavigationSuggestion(
                label="Go to Dashboard",
                path="/dashboard"
            )
        ]
    
    async def search(
        self,
        request: SmartSearchRequest,
        user: User,
        db: Session
    ) -> SmartSearchResponse:
        """Main search method"""
        start_time = time.time()
        
        # Load configurable settings
        min_confidence = self._get_min_confidence_threshold(db)
        min_similarity = self._get_min_similarity_threshold(db)
        max_results = self._get_max_results(db)
        
        try:
            # Step 1: Classify the query
            classification, token_usage = await self._classify_query(
                request.query, user, db
            )
            
            cached = (token_usage.total_tokens == 0)
            
            # Step 2: Check confidence threshold
            if classification.confidence < min_confidence:
                response_time_ms = int((time.time() - start_time) * 1000)
                # Return suggestions instead of navigating
                response = SmartSearchResponse(
                    success=False,
                    message=f"I'm not sure what you're looking for. Did you mean one of these?",
                    intent=classification.intent,
                    confidence=classification.confidence,
                    suggestions=self._build_suggestions(request.query),
                    token_usage=token_usage,
                    cached=cached,
                    response_time_ms=response_time_ms
                )
                self._log_search(db, user.id, request.query, classification, 
                               token_usage, 0, start_time, cached=cached)
                return response
            
            # Step 3: Execute search based on entity type
            entity_type = self._get_entity_type(classification.intent)
            entity_ids = []
            
            if entity_type and (classification.filters or classification.requires_semantic_search):
                entity_ids = self._hybrid_search(
                    db=db,
                    entity_type=entity_type,
                    filters=classification.filters,
                    semantic_query=classification.semantic_query if classification.requires_semantic_search else None,
                    limit=max_results,
                    min_similarity=min_similarity
                )
            
            # Step 4: Build response
            query_params = self._build_query_params(classification, entity_ids)
            
            # Build message
            result_count = len(entity_ids)
            if result_count > 0:
                message = f"Found {result_count} result{'s' if result_count != 1 else ''}"
                if classification.semantic_query:
                    message += f" for '{classification.semantic_query}'"
            else:
                message = "Navigating to your destination"
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            response = SmartSearchResponse(
                success=True,
                navigate_to=classification.target_page,
                query_params=query_params if query_params else None,
                entity_ids=entity_ids if entity_ids else None,
                message=message,
                intent=classification.intent,
                confidence=classification.confidence,
                token_usage=token_usage,
                cached=cached,
                response_time_ms=response_time_ms
            )
            
            # Log the search
            self._log_search(
                db, user.id, request.query, classification,
                token_usage, result_count, start_time,
                cached=cached
            )
            
            return response
            
        except Exception as e:
            logger.error(f"[Smart Search] Error: {e}")
            # Rollback any pending transaction
            try:
                db.rollback()
            except Exception:
                pass
            response_time_ms = int((time.time() - start_time) * 1000)
            return SmartSearchResponse(
                success=False,
                message=f"Search failed: {str(e)}",
                suggestions=self._build_suggestions(request.query),
                token_usage=TokenUsage(),
                cached=False,
                response_time_ms=response_time_ms
            )
    
    def _log_search(
        self,
        db: Session,
        user_id: int,
        query: str,
        classification: LLMClassificationResult,
        token_usage: TokenUsage,
        results_count: int,
        start_time: float,
        cached: bool = False,
        error_message: Optional[str] = None
    ):
        """Log search to database for analytics"""
        try:
            response_time_ms = int((time.time() - start_time) * 1000)
            
            log_entry = SmartSearchLog(
                user_id=user_id,
                query=query,
                intent=classification.intent,
                target_page=classification.target_page,
                filters=classification.filters,
                semantic_query=classification.semantic_query,
                input_tokens=token_usage.input_tokens,
                output_tokens=token_usage.output_tokens,
                results_count=results_count,
                confidence=classification.confidence,
                cached=cached,
                response_time_ms=response_time_ms,
                error_message=error_message
            )
            
            db.add(log_entry)
            db.commit()
            
        except Exception as e:
            logger.error(f"[Smart Search] Failed to log search: {e}")
            db.rollback()


    def get_llm_settings(self, db: Session = None) -> Dict[str, Any]:
        """Get current LLM configuration settings"""
        # If db is provided, get actual values from database
        if db:
            return {
                "model_name": GEMINI_MODEL,
                "temperature": 0.1,
                "max_output_tokens": 500,
                "cache_ttl_seconds": self._get_cache_ttl(db),
                "min_confidence_threshold": self._get_min_confidence_threshold(db),
                "min_similarity_threshold": self._get_min_similarity_threshold(db),
                "max_results": self._get_max_results(db)
            }
        # Return defaults if no db session
        return {
            "model_name": GEMINI_MODEL,
            "temperature": 0.1,
            "max_output_tokens": 500,
            "cache_ttl_seconds": DEFAULT_LLM_CACHE_TTL,
            "min_confidence_threshold": DEFAULT_MIN_CONFIDENCE_THRESHOLD,
            "min_similarity_threshold": DEFAULT_MIN_SIMILARITY_THRESHOLD,
            "max_results": DEFAULT_MAX_RESULTS
        }
    
    def update_settings(self, db: Session, settings: Dict[str, Any]) -> bool:
        """Update smart search settings in the database (super admin only)"""
        from app.models.models import ApplicationSetting
        
        try:
            setting_mappings = {
                "min_similarity_threshold": "smart_search_min_similarity",
                "min_confidence_threshold": "smart_search_min_confidence",
                "cache_ttl_seconds": "smart_search_cache_ttl",
                "max_results": "smart_search_max_results"
            }
            
            for key, value in settings.items():
                if key in setting_mappings and value is not None:
                    db_key = setting_mappings[key]
                    existing = db.query(ApplicationSetting).filter(
                        ApplicationSetting.key == db_key
                    ).first()
                    
                    if existing:
                        existing.value = str(value)
                    else:
                        new_setting = ApplicationSetting(
                            key=db_key,
                            value=str(value),
                            description=f"Smart search {key.replace('_', ' ')}"
                        )
                        db.add(new_setting)
                    
                    # Clear settings cache
                    cache_key = f"setting:{db_key}"
                    if cache_key in self._settings_cache:
                        del self._settings_cache[cache_key]
            
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to update settings: {e}")
            db.rollback()
            return False


# Singleton instance
smart_search_service = SmartSearchService()

