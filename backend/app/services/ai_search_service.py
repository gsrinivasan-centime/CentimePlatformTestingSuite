"""
AI Search Service for Test Cases using Google Gemini

Uses Gemini 2.5 Flash to understand natural language queries and find relevant test cases.
Includes rate limiting, caching, token usage tracking, and hybrid search (keywords + embeddings).

Hybrid Search Architecture:
1. Gemini extracts keywords from natural language query
2. Parallel execution: keyword ILIKE search + pgvector embedding similarity
3. Results merged with weighted scoring (default: 60% semantic, 40% keyword)
4. IVFFlat index ensures <50ms vector queries on 10K+ rows
"""

import hashlib
import time
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text

from app.core.config import settings
from app.models.models import TestCase, Module, ApplicationSetting

# Configure logging for hybrid search debugging
logger = logging.getLogger(__name__)


# In-memory cache for query results (TTL: 5 minutes)
_query_cache: Dict[str, Tuple[List[int], float, dict]] = {}
CACHE_TTL_SECONDS = 300

# In-memory rate limiting tracker
_rate_limit_tracker: Dict[int, List[float]] = defaultdict(list)

DEFAULT_RATE_LIMIT = 10
DEFAULT_TOKEN_BUDGET_ALERT = 100000

# Stop words to filter out from search keywords
STOP_WORDS = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
              'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 
              'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
              'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
              'into', 'through', 'during', 'before', 'after', 'above', 'below',
              'between', 'under', 'again', 'further', 'then', 'once', 'all', 'get', 'me',
              'show', 'find', 'search', 'list', 'give', 'display', 'fetch', 'retrieve',
              'test', 'tests', 'case', 'cases', 'related', 'about', 'regarding'}

# Hybrid search configuration defaults
DEFAULT_SEMANTIC_WEIGHT = 0.6  # 60% semantic, 40% keyword
DEFAULT_MIN_SIMILARITY = 0.30  # 30% minimum cosine similarity
HYBRID_SEARCH_VECTOR_LIMIT = 50  # Max results from vector search before merge
IVFFLAT_PROBES = 10  # Number of lists to probe (higher = better recall, slower)


class AISearchService:
    """Service for AI-powered test case search using Google Gemini"""
    
    def __init__(self):
        self._model = None
        self._initialized = False
        
    def _initialize(self):
        """Lazy initialization of Gemini client"""
        if self._initialized:
            return
            
        api_key = getattr(settings, 'GOOGLE_API_KEY', None)
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not configured. Please add it to your .env file.")
        
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel('gemini-2.5-flash')
        self._initialized = True
    
    def _get_cache_key(self, query: str, module_id: Optional[int] = None) -> str:
        """Generate cache key from query and optional module filter"""
        key_str = f"{query.lower().strip()}:{module_id or 'all'}"
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]
    
    def _check_cache(self, cache_key: str) -> Optional[Tuple[List[int], dict]]:
        """Check if query result is cached and not expired"""
        if cache_key in _query_cache:
            test_case_ids, timestamp, token_info = _query_cache[cache_key]
            if time.time() - timestamp < CACHE_TTL_SECONDS:
                return test_case_ids, token_info
            del _query_cache[cache_key]
        return None
    
    def _add_to_cache(self, cache_key: str, test_case_ids: List[int], token_info: dict):
        """Add query result to cache"""
        if len(_query_cache) >= 100:
            oldest_key = min(_query_cache.keys(), key=lambda k: _query_cache[k][1])
            del _query_cache[oldest_key]
        _query_cache[cache_key] = (test_case_ids, time.time(), token_info)
    
    def check_rate_limit(self, user_id: int, db: Session) -> Tuple[bool, int]:
        """
        Check if user has exceeded rate limit.
        Returns (is_allowed, seconds_to_wait)
        """
        rate_limit_setting = db.query(ApplicationSetting).filter(
            ApplicationSetting.key == "ai_search_rate_limit"
        ).first()
        rate_limit = int(rate_limit_setting.value) if rate_limit_setting else DEFAULT_RATE_LIMIT
        
        current_time = time.time()
        window_start = current_time - 60
        
        _rate_limit_tracker[user_id] = [
            t for t in _rate_limit_tracker[user_id] if t > window_start
        ]
        
        if len(_rate_limit_tracker[user_id]) >= rate_limit:
            oldest_request = min(_rate_limit_tracker[user_id])
            wait_seconds = int(60 - (current_time - oldest_request)) + 1
            return False, wait_seconds
        
        _rate_limit_tracker[user_id].append(current_time)
        return True, 0
    
    def _build_context_prompt(self, db: Session) -> str:
        """Build context about available modules and test case structure"""
        modules = db.query(Module).all()
        module_info = [f"- {m.name} (ID: {m.id})" for m in modules]
        
        sub_modules = db.query(TestCase.sub_module).distinct().filter(
            TestCase.sub_module.isnot(None)
        ).all()
        sub_module_list = [sm[0] for sm in sub_modules if sm[0]]
        
        feature_sections = db.query(TestCase.feature_section).distinct().filter(
            TestCase.feature_section.isnot(None)
        ).all()
        feature_list = [f[0] for f in feature_sections if f[0]]
        
        return f"""You are a test case search assistant for a finance automation platform (Accounts Payable, Accounts Receivable, Payment Hub).

Available Modules:
{chr(10).join(module_info) if module_info else "No modules defined yet"}

Available Sub-Modules: {', '.join(sub_module_list[:20]) if sub_module_list else "None"}

Available Feature Sections: {', '.join(feature_list[:20]) if feature_list else "None"}

Test Case Attributes to search:
- title: Test case name
- steps_to_reproduce: Step-by-step instructions  
- expected_result: Expected outcome
- preconditions: Prerequisites
- description: Detailed description
- module: Parent module (AP, AR, etc.)
- sub_module: Sub-category within module
- feature_section: Specific feature area
- tag: Test type (ui, api, hybrid)

IMPORTANT: Return ONLY a valid JSON object with search criteria. No explanations, no markdown code blocks."""
    
    def _build_search_query(self, user_query: str, context: str) -> str:
        """Build the prompt for Gemini"""
        return f"""{context}

User Query: "{user_query}"

Analyze the user's query and extract search criteria. Consider:
1. What functionality/feature are they looking for?
2. Which module might it belong to (infer from context if not explicit)?
3. Key terms that might appear in test titles, steps, or expected results
4. Any specific test type (UI, API, hybrid)?

Return a JSON object with these fields (all optional):
{{
    "keywords": ["list", "of", "search", "terms"],
    "module_hints": ["possible", "module", "names"],
    "sub_module_hints": ["possible", "sub_module", "names"],
    "tag_filter": "ui|api|hybrid|null",
    "search_fields": ["title", "steps_to_reproduce", "expected_result"]
}}

Return ONLY the JSON object, no other text or formatting."""
    
    def _get_hybrid_settings(self, db: Session) -> Dict:
        """Get hybrid search configuration from application settings"""
        settings_map = {}
        
        # Fetch all hybrid search settings in one query
        setting_keys = ['hybrid_search_enabled', 'hybrid_search_semantic_weight', 'hybrid_search_min_similarity']
        settings_result = db.query(ApplicationSetting).filter(
            ApplicationSetting.key.in_(setting_keys)
        ).all()
        
        for s in settings_result:
            settings_map[s.key] = s.value
        
        return {
            'enabled': settings_map.get('hybrid_search_enabled', 'true').lower() == 'true',
            'semantic_weight': float(settings_map.get('hybrid_search_semantic_weight', str(DEFAULT_SEMANTIC_WEIGHT))),
            'min_similarity': float(settings_map.get('hybrid_search_min_similarity', str(DEFAULT_MIN_SIMILARITY)))
        }
    
    def _pgvector_search(
        self,
        db: Session,
        query_text: str,
        module_id: Optional[int] = None,
        min_similarity: float = DEFAULT_MIN_SIMILARITY,
        limit: int = HYBRID_SEARCH_VECTOR_LIMIT
    ) -> List[Tuple[int, float]]:
        """
        Execute pgvector similarity search using IVFFlat index.
        
        Returns list of (test_case_id, similarity_score) tuples.
        Uses cosine distance operator (<=>) with embedding cast to vector(384).
        
        Args:
            db: Database session
            query_text: Natural language query to embed
            module_id: Optional module filter
            min_similarity: Minimum cosine similarity (0.0-1.0), default 0.30
            limit: Maximum results to return
            
        Returns:
            List of (id, similarity) tuples, sorted by similarity descending
        """
        try:
            # Import embedding service for query embedding generation
            from app.services.embedding_service import get_embedding_service
            embedding_service = get_embedding_service()
            
            # Generate embedding for the query
            query_embedding = embedding_service.generate_embedding(query_text)
            if query_embedding is None:
                logger.warning(f"Failed to generate embedding for query: {query_text[:50]}...")
                return []
            
            # Convert to string format for SQL (pgvector expects '[0.1, 0.2, ...]' format)
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
            
            # Set IVFFlat probes for better recall (default is 1, we use 10 for ~95% recall)
            db.execute(text(f"SET ivfflat.probes = {IVFFLAT_PROBES}"))
            
            # Build the pgvector similarity query
            # cosine distance = 1 - cosine_similarity, so we need to filter where distance < (1 - min_similarity)
            max_distance = 1.0 - min_similarity
            
            # NOTE: We embed the query vector directly in SQL string because SQLAlchemy 
            # doesn't handle pgvector's ::vector() cast with parameterized queries well
            if module_id:
                sql = text(f"""
                    SELECT id, 1 - (embedding::vector(384) <=> '{embedding_str}'::vector(384)) as similarity
                    FROM test_cases 
                    WHERE embedding IS NOT NULL 
                      AND module_id = :module_id
                      AND (embedding::vector(384) <=> '{embedding_str}'::vector(384)) < :max_distance
                    ORDER BY embedding::vector(384) <=> '{embedding_str}'::vector(384)
                    LIMIT :limit
                """)
                result = db.execute(sql, {
                    'module_id': module_id,
                    'max_distance': max_distance,
                    'limit': limit
                })
            else:
                sql = text(f"""
                    SELECT id, 1 - (embedding::vector(384) <=> '{embedding_str}'::vector(384)) as similarity
                    FROM test_cases 
                    WHERE embedding IS NOT NULL 
                      AND (embedding::vector(384) <=> '{embedding_str}'::vector(384)) < :max_distance
                    ORDER BY embedding::vector(384) <=> '{embedding_str}'::vector(384)
                    LIMIT :limit
                """)
                result = db.execute(sql, {
                    'max_distance': max_distance,
                    'limit': limit
                })
            
            results = [(row[0], float(row[1])) for row in result.fetchall()]
            logger.info(f"[Hybrid Search] pgvector returned {len(results)} results (min_sim={min_similarity})")
            return results
            
        except Exception as e:
            # Graceful fallback - log error and return empty (keyword search will still work)
            logger.warning(f"[Hybrid Search] pgvector search failed, falling back to keyword-only: {str(e)}")
            return []
    
    def _hybrid_merge(
        self,
        keyword_ids: List[int],
        vector_results: List[Tuple[int, float]],
        semantic_weight: float = DEFAULT_SEMANTIC_WEIGHT,
        module_boosted_ids: List[int] = None
    ) -> List[int]:
        """
        Merge keyword and vector search results with weighted scoring.
        
        Scoring algorithm:
        - Keyword match: score = 1.0 (binary - either matches or doesn't)
        - Semantic match: score = cosine_similarity (0.0 to 1.0)
        - Module hint boost: +0.15 bonus for results in Gemini-suggested modules
        - Final score = (semantic_weight * semantic_score) + ((1 - semantic_weight) * keyword_score) + module_boost
        
        Args:
            keyword_ids: List of test case IDs from keyword ILIKE search
            vector_results: List of (id, similarity) from pgvector search
            semantic_weight: Weight for semantic scores (0.0 to 1.0)
            module_boosted_ids: List of test case IDs that match Gemini's module_hints (get +15% boost)
            
        Returns:
            List of test case IDs sorted by combined score descending
        """
        keyword_weight = 1.0 - semantic_weight
        module_boost = 0.15  # 15% boost for matching module hints
        module_boosted_set = set(module_boosted_ids or [])
        
        # Build score map
        scores: Dict[int, Dict] = {}
        
        # Add keyword matches with normalized score of 1.0
        for tc_id in keyword_ids:
            has_module_boost = tc_id in module_boosted_set
            scores[tc_id] = {
                'keyword_score': 1.0,
                'semantic_score': 0.0,
                'module_boost': module_boost if has_module_boost else 0.0,
                'combined': keyword_weight * 1.0 + (module_boost if has_module_boost else 0.0)
            }
        
        # Add/update with semantic scores
        for tc_id, similarity in vector_results:
            has_module_boost = tc_id in module_boosted_set
            boost = module_boost if has_module_boost else 0.0
            
            if tc_id in scores:
                # Already has keyword match - add semantic component
                scores[tc_id]['semantic_score'] = similarity
                scores[tc_id]['module_boost'] = boost
                scores[tc_id]['combined'] = (
                    (semantic_weight * similarity) + 
                    (keyword_weight * scores[tc_id]['keyword_score']) +
                    boost
                )
            else:
                # Only semantic match, no keyword match
                scores[tc_id] = {
                    'keyword_score': 0.0,
                    'semantic_score': similarity,
                    'module_boost': boost,
                    'combined': semantic_weight * similarity + boost
                }
        
        # Sort by combined score descending
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x]['combined'], reverse=True)
        
        # Log merge statistics
        keyword_only = sum(1 for s in scores.values() if s['keyword_score'] > 0 and s['semantic_score'] == 0)
        semantic_only = sum(1 for s in scores.values() if s['keyword_score'] == 0 and s['semantic_score'] > 0)
        both = sum(1 for s in scores.values() if s['keyword_score'] > 0 and s['semantic_score'] > 0)
        module_boosted = sum(1 for s in scores.values() if s.get('module_boost', 0) > 0)
        
        logger.info(f"[Hybrid Search] Merged results: {len(sorted_ids)} total "
                   f"(keyword-only: {keyword_only}, semantic-only: {semantic_only}, both: {both}, module-boosted: {module_boosted})")
        
        return sorted_ids
    
    async def search_test_cases(
        self, 
        query: str, 
        db: Session, 
        user_id: int,
        module_id: Optional[int] = None
    ) -> Dict:
        """
        Search for test cases using AI-powered natural language understanding.
        
        Returns:
            Dict with test_case_ids, token_usage, cached flag
        """
        self._initialize()
        
        # Check cache first
        cache_key = self._get_cache_key(query, module_id)
        cached_result = self._check_cache(cache_key)
        if cached_result:
            test_case_ids, token_info = cached_result
            return {
                "test_case_ids": test_case_ids,
                "total_results": len(test_case_ids),
                "cached": True,
                "tokens": token_info
            }
        
        # Build prompts
        context = self._build_context_prompt(db)
        search_prompt = self._build_search_query(query, context)
        
        try:
            response = self._model.generate_content(
                search_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=500
                )
            )
            
            # Check if response has valid content before accessing .text
            # finish_reason 1 = STOP (normal), 2 = MAX_TOKENS, 3 = SAFETY, 4 = RECITATION, 5 = OTHER
            if not response.candidates or not response.candidates[0].content.parts:
                # No valid response from Gemini, use fallback
                print(f"Gemini returned no valid content for query: {query}")
                search_criteria = {
                    "keywords": query.split(),
                    "search_fields": ["title", "steps_to_reproduce", "expected_result"]
                }
                token_info = {
                    "input_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0) if response.usage_metadata else 0,
                    "output_tokens": 0,
                    "total_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0) if response.usage_metadata else 0
                }
            else:
                # Extract token usage
                token_info = {
                    "input_tokens": response.usage_metadata.prompt_token_count,
                    "output_tokens": response.usage_metadata.candidates_token_count,
                    "total_tokens": response.usage_metadata.total_token_count
                }
                
                # Parse response
                response_text = response.text.strip()
                # Remove markdown code blocks if present
                if response_text.startswith("```"):
                    lines = response_text.split("\n")
                    response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()
                
                search_criteria = json.loads(response_text)
            
        except json.JSONDecodeError as e:
            # Fallback to basic text search if AI response is invalid
            # Filter out stop words from the query
            filtered_keywords = [w for w in query.split() if len(w) >= 2 and w.lower() not in STOP_WORDS]
            search_criteria = {
                "keywords": filtered_keywords if filtered_keywords else query.split()[-3:],  # Use last 3 words if all filtered
                "search_fields": ["title", "steps_to_reproduce", "expected_result"]
            }
            token_info = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "parse_error": str(e)}
        except Exception as e:
            # Fallback to basic search when Gemini API fails
            test_case_ids = self.fallback_text_search(query, db, module_id)
            return {
                "test_case_ids": test_case_ids,
                "total_results": len(test_case_ids),
                "cached": False,
                "tokens": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0},
                "fallback": True,
                "error": str(e)
            }
        
        # Execute hybrid database search based on AI criteria
        # Pass original query for embedding generation in pgvector search
        test_case_ids = self._execute_search(db, search_criteria, module_id, original_query=query)
        
        # Cache the result
        self._add_to_cache(cache_key, test_case_ids, token_info)
        
        # Log the search
        self._log_search(db, user_id, query, module_id, test_case_ids, token_info)
        
        return {
            "test_case_ids": test_case_ids,
            "total_results": len(test_case_ids),
            "cached": False,
            "tokens": token_info,
            "search_criteria": search_criteria
        }
    
    def _execute_search(
        self, 
        db: Session, 
        criteria: Dict, 
        module_id: Optional[int] = None,
        original_query: str = None
    ) -> List[int]:
        """
        Execute hybrid database search based on AI-extracted criteria.
        
        Combines keyword ILIKE search with pgvector embedding similarity.
        Falls back to keyword-only if embedding search fails or is disabled.
        
        Args:
            db: Database session
            criteria: AI-extracted search criteria (keywords, filters, etc.)
            module_id: Optional module filter
            original_query: Original user query for embedding generation
            
        Returns:
            List of test case IDs sorted by hybrid relevance score
        """
        # Get hybrid search settings
        hybrid_settings = self._get_hybrid_settings(db)
        
        # === STEP 0: Resolve module hints to IDs for soft boosting ===
        # Module hints are used as a SOFT ranking signal (+15% boost), not a hard filter
        # This way, if Gemini suggests "Payments System" but the test is in "Account Receivables",
        # the test still appears - just slightly lower ranked if a matching module result exists
        module_boosted_ids = []
        if criteria.get("module_hints") and not module_id:
            hint_modules = db.query(Module).filter(
                or_(*[Module.name.ilike(f"%{name}%") for name in criteria["module_hints"]])
            ).all()
            if hint_modules:
                hint_module_ids = [m.id for m in hint_modules]
                # Get all test case IDs that belong to the hinted modules
                boosted_results = db.query(TestCase.id).filter(
                    TestCase.module_id.in_(hint_module_ids)
                ).all()
                module_boosted_ids = [r[0] for r in boosted_results]
                logger.info(f"[Hybrid Search] Module hints {criteria['module_hints']} resolved to {len(module_boosted_ids)} test cases for boosting")
        
        # === STEP 1: Build keyword search query ===
        query = db.query(TestCase.id)
        
        # Apply module filter ONLY if user explicitly specified one
        if module_id:
            query = query.filter(TestCase.module_id == module_id)
        
        # Apply tag filter if specified (this is usually accurate from Gemini)
        tag_filter = criteria.get("tag_filter")
        if tag_filter and tag_filter not in ["null", None, ""]:
            query = query.filter(TestCase.tag == tag_filter)
        
        # Apply keyword search across specified fields
        keywords = criteria.get("keywords", [])
        search_fields = criteria.get("search_fields", ["title", "steps_to_reproduce", "expected_result"])
        
        # Split multi-word keywords into individual words and flatten
        # e.g., ["ACH", "payment method"] -> ["ACH", "payment", "method"]
        expanded_keywords = []
        for kw in keywords:
            words = kw.split()
            expanded_keywords.extend(words)
        keywords = expanded_keywords
        
        # Filter out very short keywords, common words, and duplicates
        keywords = list(set([k for k in keywords if len(k) >= 2 and k.lower() not in STOP_WORDS]))
        
        logger.info(f"[AI Search] Final keywords after processing: {keywords}")
        
        # Clone query for keyword search before adding keyword conditions
        keyword_query = query
        
        if keywords:
            # Strategy: Each keyword must match at least one field (AND between keywords, OR between fields)
            for keyword in keywords:
                field_conditions = []
                if "title" in search_fields:
                    field_conditions.append(TestCase.title.ilike(f"%{keyword}%"))
                if "steps_to_reproduce" in search_fields:
                    field_conditions.append(TestCase.steps_to_reproduce.ilike(f"%{keyword}%"))
                if "expected_result" in search_fields:
                    field_conditions.append(TestCase.expected_result.ilike(f"%{keyword}%"))
                if "description" in search_fields:
                    field_conditions.append(TestCase.description.ilike(f"%{keyword}%"))
                if "preconditions" in search_fields:
                    field_conditions.append(TestCase.preconditions.ilike(f"%{keyword}%"))
                if "feature_section" in search_fields:
                    field_conditions.append(TestCase.feature_section.ilike(f"%{keyword}%"))
                
                if field_conditions:
                    keyword_query = keyword_query.filter(or_(*field_conditions))
        
        # Execute keyword search
        keyword_results = keyword_query.limit(100).all()
        keyword_ids = [r[0] for r in keyword_results]
        
        logger.info(f"[Hybrid Search] Keyword search returned {len(keyword_ids)} results")
        
        # === STEP 2: Execute pgvector similarity search (if enabled) ===
        vector_results = []
        
        if hybrid_settings['enabled'] and original_query:
            try:
                vector_results = self._pgvector_search(
                    db=db,
                    query_text=original_query,
                    module_id=module_id,
                    min_similarity=hybrid_settings['min_similarity'],
                    limit=HYBRID_SEARCH_VECTOR_LIMIT
                )
            except Exception as e:
                # Graceful fallback - pgvector failed, continue with keyword-only
                logger.warning(f"[Hybrid Search] Vector search failed, using keyword-only: {str(e)}")
                vector_results = []
        
        # === STEP 3: Merge results with weighted scoring ===
        if vector_results or module_boosted_ids:
            # Hybrid merge with configured weights and module boost
            merged_ids = self._hybrid_merge(
                keyword_ids=keyword_ids,
                vector_results=vector_results,
                semantic_weight=hybrid_settings['semantic_weight'],
                module_boosted_ids=module_boosted_ids
            )
            # Limit to 100 results
            return merged_ids[:100]
        else:
            # No vector results and no module hints - return keyword results only
            logger.info("[Hybrid Search] No vector results or module hints, returning keyword-only results")
            return keyword_ids
    
    def _log_search(
        self, 
        db: Session, 
        user_id: int, 
        query: str, 
        module_id: Optional[int],
        test_case_ids: List[int],
        token_info: dict
    ):
        """Log search to database for analytics and history"""
        from app.models.models import AISearchLog
        
        log_entry = AISearchLog(
            user_id=user_id,
            query=query,
            module_id=module_id,
            input_tokens=token_info.get("input_tokens", 0),
            output_tokens=token_info.get("output_tokens", 0),
            total_tokens=token_info.get("total_tokens", 0),
            results_count=len(test_case_ids),
            cached=False
        )
        db.add(log_entry)
        db.commit()
        
        # Maintain only last 5 searches per user in history
        self._cleanup_user_history(db, user_id)
    
    def _cleanup_user_history(self, db: Session, user_id: int):
        """Keep only the last 5 searches per user (FIFO)"""
        from app.models.models import AISearchLog
        
        count = db.query(func.count(AISearchLog.id)).filter(
            AISearchLog.user_id == user_id
        ).scalar()
        
        if count > 5:
            oldest_entries = db.query(AISearchLog.id).filter(
                AISearchLog.user_id == user_id
            ).order_by(AISearchLog.created_at.asc()).limit(count - 5).all()
            
            if oldest_entries:
                db.query(AISearchLog).filter(
                    AISearchLog.id.in_([e[0] for e in oldest_entries])
                ).delete(synchronize_session=False)
                db.commit()
    
    def get_user_search_history(self, db: Session, user_id: int) -> List[Dict]:
        """Get last 5 searches for a user"""
        from app.models.models import AISearchLog
        
        history = db.query(AISearchLog).filter(
            AISearchLog.user_id == user_id
        ).order_by(AISearchLog.created_at.desc()).limit(5).all()
        
        return [
            {
                "id": h.id,
                "query": h.query,
                "module_id": h.module_id,
                "results_count": h.results_count,
                "tokens_used": h.total_tokens,
                "created_at": h.created_at.isoformat()
            }
            for h in history
        ]
    
    def get_token_usage_stats(self, db: Session, user_id: Optional[int] = None) -> Dict:
        """Get token usage statistics for current month"""
        from app.models.models import AISearchLog
        
        # Get first day of current month
        first_day_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Base query for monthly stats
        query = db.query(
            func.sum(AISearchLog.input_tokens).label("total_input"),
            func.sum(AISearchLog.output_tokens).label("total_output"),
            func.sum(AISearchLog.total_tokens).label("total_tokens"),
            func.count(AISearchLog.id).label("total_searches")
        ).filter(AISearchLog.created_at >= first_day_of_month)
        
        if user_id:
            query = query.filter(AISearchLog.user_id == user_id)
        
        result = query.first()
        
        # Get daily breakdown for charts
        daily_stats = db.query(
            func.date(AISearchLog.created_at).label("date"),
            func.sum(AISearchLog.total_tokens).label("tokens"),
            func.count(AISearchLog.id).label("searches")
        ).filter(
            AISearchLog.created_at >= first_day_of_month
        )
        
        if user_id:
            daily_stats = daily_stats.filter(AISearchLog.user_id == user_id)
        
        daily_stats = daily_stats.group_by(func.date(AISearchLog.created_at)).order_by(
            func.date(AISearchLog.created_at)
        ).all()
        
        # Get token budget from settings
        budget_setting = db.query(ApplicationSetting).filter(
            ApplicationSetting.key == "ai_search_token_budget"
        ).first()
        token_budget = int(budget_setting.value) if budget_setting else DEFAULT_TOKEN_BUDGET_ALERT
        
        monthly_tokens = result.total_tokens or 0
        
        return {
            "monthly_input_tokens": result.total_input or 0,
            "monthly_output_tokens": result.total_output or 0,
            "monthly_total_tokens": monthly_tokens,
            "monthly_searches": result.total_searches or 0,
            "token_budget": token_budget,
            "budget_exceeded": monthly_tokens > token_budget,
            "budget_usage_percent": round((monthly_tokens / token_budget) * 100, 1) if token_budget > 0 else 0,
            "daily_breakdown": [
                {
                    "date": str(d.date),
                    "tokens": d.tokens or 0,
                    "searches": d.searches or 0
                }
                for d in daily_stats
            ]
        }
    
    def fallback_text_search(self, query: str, db: Session, module_id: Optional[int] = None) -> List[int]:
        """Fallback to basic text search when Gemini API fails"""
        keywords = query.split()
        
        q = db.query(TestCase.id)
        
        if module_id:
            q = q.filter(TestCase.module_id == module_id)
        
        for keyword in keywords:
            if len(keyword) >= 2:  # Skip very short words
                q = q.filter(
                    or_(
                        TestCase.title.ilike(f"%{keyword}%"),
                        TestCase.steps_to_reproduce.ilike(f"%{keyword}%"),
                        TestCase.expected_result.ilike(f"%{keyword}%"),
                        TestCase.description.ilike(f"%{keyword}%")
                    )
                )
        
        results = q.limit(100).all()
        return [r[0] for r in results]


# Singleton instance
_ai_search_service = None


def get_ai_search_service() -> AISearchService:
    """Get singleton instance of AI search service"""
    global _ai_search_service
    if _ai_search_service is None:
        _ai_search_service = AISearchService()
    return _ai_search_service
