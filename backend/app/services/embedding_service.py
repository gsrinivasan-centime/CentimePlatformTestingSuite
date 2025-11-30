"""
Embedding Service for Test Case Similarity Analysis

Uses sentence-transformers to generate embeddings and pgvector for similarity search.
Supports multiple models: MiniLM (faster) and BGE-small (more accurate).
"""

import os
import asyncio
from typing import List, Dict, Optional, Tuple
from functools import lru_cache
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

# Lazy import for sentence_transformers to avoid slow startup
_sentence_transformer_model = None
_loaded_models: Dict[str, any] = {}
_model_status: Dict[str, str] = {}

# Supported models configuration
SUPPORTED_MODELS = {
    "all-MiniLM-L6-v2": {
        "name": "all-MiniLM-L6-v2",
        "display_name": "MiniLM-L6-v2 (Faster)",
        "dimensions": 384,
        "description": "Fast, lightweight model. Good for general similarity."
    },
    "BAAI/bge-small-en-v1.5": {
        "name": "BAAI/bge-small-en-v1.5",
        "display_name": "BGE-small-en-v1.5 (More Accurate)",
        "dimensions": 384,
        "description": "Better accuracy for semantic similarity. Slightly slower."
    }
}

DEFAULT_MODEL = "all-MiniLM-L6-v2"


class EmbeddingService:
    """Service for generating and managing test case embeddings"""
    
    def __init__(self):
        self._models: Dict[str, any] = {}
        self._model_status: Dict[str, str] = {
            model: "not_downloaded" for model in SUPPORTED_MODELS.keys()
        }
    
    def _get_model(self, model_name: str):
        """Load or retrieve cached model"""
        global _loaded_models, _model_status
        
        if model_name not in SUPPORTED_MODELS:
            raise ValueError(f"Unsupported model: {model_name}. Supported: {list(SUPPORTED_MODELS.keys())}")
        
        if model_name not in _loaded_models:
            try:
                _model_status[model_name] = "loading"
                print(f"🔄 Loading embedding model: {model_name}...")
                
                from sentence_transformers import SentenceTransformer
                _loaded_models[model_name] = SentenceTransformer(model_name)
                _model_status[model_name] = "loaded"
                
                print(f"✅ Model loaded: {model_name}")
            except Exception as e:
                _model_status[model_name] = "error"
                print(f"❌ Failed to load model {model_name}: {e}")
                raise
        
        return _loaded_models[model_name]
    
    def get_model_status(self) -> Dict[str, Dict]:
        """Get status of all supported models"""
        global _model_status, _loaded_models
        
        result = {}
        for model_name, config in SUPPORTED_MODELS.items():
            # Check if model files exist in cache
            cache_dir = os.path.expanduser("~/.cache/torch/sentence_transformers")
            model_cache_name = model_name.replace("/", "_")
            model_path = os.path.join(cache_dir, model_cache_name)
            
            is_downloaded = os.path.exists(model_path)
            is_loaded = model_name in _loaded_models
            
            status = "loaded" if is_loaded else ("downloaded" if is_downloaded else "not_downloaded")
            
            result[model_name] = {
                **config,
                "status": status,
                "is_downloaded": is_downloaded,
                "is_loaded": is_loaded
            }
        
        return result
    
    def generate_embedding(self, text: str, model_name: str = DEFAULT_MODEL) -> List[float]:
        """Generate embedding vector for text using specified model"""
        if not text or not text.strip():
            return None
        
        model = self._get_model(model_name)
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    
    def prepare_text_for_embedding(
        self, 
        title: str, 
        steps: str = None,
        tag: str = None,
        test_type: str = None,
        module_name: str = None,
        sub_module: str = None,
        expected_result: str = None
    ) -> str:
        """
        Prepare test case text for embedding generation.
        
        Includes all relevant metadata fields to enable semantic search on:
        - Title and description/steps
        - Tag (UI, API, etc.)
        - Test type (Functional, Regression, etc.)
        - Module and sub-module names
        - Expected results
        """
        text_parts = []
        
        # Add metadata fields with labels to help semantic understanding
        if tag:
            text_parts.append(f"Tag: {tag.strip()}")
        
        if test_type:
            text_parts.append(f"Type: {test_type.strip()}")
        
        if module_name:
            text_parts.append(f"Module: {module_name.strip()}")
        
        if sub_module:
            text_parts.append(f"SubModule: {sub_module.strip()}")
        
        # Add main content
        if title:
            text_parts.append(f"Title: {title.strip()}")
        
        if steps:
            # Clean up steps text
            cleaned_steps = steps.strip()
            text_parts.append(f"Steps: {cleaned_steps}")
        
        if expected_result:
            text_parts.append(f"Expected: {expected_result.strip()}")
        
        return " | ".join(text_parts)
    
    def generate_embeddings_batch(self, texts: List[str], model_name: str = DEFAULT_MODEL) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently"""
        if not texts:
            return []
        
        model = self._get_model(model_name)
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [emb.tolist() for emb in embeddings]
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if vec1 is None or vec2 is None:
            return 0.0
        
        arr1 = np.array(vec1)
        arr2 = np.array(vec2)
        
        dot_product = np.dot(arr1, arr2)
        norm1 = np.linalg.norm(arr1)
        norm2 = np.linalg.norm(arr2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def find_similar_test_cases(
        self,
        embedding: List[float],
        db: Session,
        threshold: float = 0.75,
        limit: int = 5,
        exclude_ids: List[int] = None
    ) -> List[Dict]:
        """
        Find similar test cases using cosine similarity.
        
        Uses Python-based similarity calculation since we store embeddings as arrays.
        For production with large datasets, consider using pgvector's native operators.
        """
        from app.models.models import TestCase
        
        if embedding is None:
            return []
        
        # Get all test cases with embeddings
        query = db.query(TestCase).filter(TestCase.embedding.isnot(None))
        
        if exclude_ids:
            query = query.filter(~TestCase.id.in_(exclude_ids))
        
        test_cases = query.all()
        
        # Calculate similarities
        results = []
        for tc in test_cases:
            if tc.embedding:
                similarity = self.cosine_similarity(embedding, tc.embedding)
                similarity_percent = round(similarity * 100, 1)
                
                if similarity_percent >= threshold:
                    results.append({
                        "test_case_id": tc.id,
                        "test_id": tc.test_id,
                        "title": tc.title,
                        "similarity_percent": similarity_percent,
                        "embedding_model": tc.embedding_model
                    })
        
        # Sort by similarity descending and limit
        results.sort(key=lambda x: x["similarity_percent"], reverse=True)
        return results[:limit]
    
    def similarity_search(
        self,
        db: Session,
        query_embedding: List[float],
        top_k: int = 50,
        filter_ids: List[int] = None,
        model_name: str = DEFAULT_MODEL,
        min_similarity: float = 0.3
    ) -> List[Tuple[int, float]]:
        """
        Search for similar test cases using pgvector cosine distance.
        
        Args:
            db: Database session
            query_embedding: Query vector
            top_k: Maximum results to return
            filter_ids: Optional list of IDs to filter results
            model_name: Embedding model name for filtering
            min_similarity: Minimum similarity threshold (0.0-1.0) to include in results
            
        Returns:
            List of (test_case_id, similarity_score) tuples
        """
        from app.models.models import TestCase
        
        if query_embedding is None:
            return []
        
        try:
            # Format embedding as postgres vector literal
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            # Build SQL query with pgvector cosine distance
            # Note: embedding column is stored as double precision[], needs to be cast to vector
            filter_clause = ""
            params = {"limit": top_k, "min_similarity": min_similarity}
            
            if filter_ids:
                filter_clause = "AND id = ANY(:filter_ids)"
                params["filter_ids"] = filter_ids
            
            # Use string formatting for the vector literal (it's safe since it's generated from floats)
            # Cast embedding array to vector type for pgvector operator
            sql = text(f"""
                SELECT id, 1 - (embedding::vector <=> '{embedding_str}'::vector) as similarity
                FROM test_cases
                WHERE embedding IS NOT NULL
                {filter_clause}
                AND (1 - (embedding::vector <=> '{embedding_str}'::vector)) >= :min_similarity
                ORDER BY embedding::vector <=> '{embedding_str}'::vector
                LIMIT :limit
            """)
            
            result = db.execute(sql, params)
            return [(row[0], row[1]) for row in result.fetchall()]
            
        except Exception as e:
            print(f"[EmbeddingService] Vector search failed: {e}")
            # Rollback the failed transaction before fallback
            try:
                db.rollback()
            except Exception:
                pass
            # Fallback to Python-based similarity
            return self._python_similarity_search(
                db, query_embedding, top_k, filter_ids, min_similarity
            )
    
    def _python_similarity_search(
        self,
        db: Session,
        query_embedding: List[float],
        top_k: int = 50,
        filter_ids: List[int] = None,
        min_similarity: float = 0.3
    ) -> List[Tuple[int, float]]:
        """Fallback Python-based similarity search"""
        from app.models.models import TestCase
        
        query = db.query(TestCase).filter(TestCase.embedding.isnot(None))
        if filter_ids:
            query = query.filter(TestCase.id.in_(filter_ids))
        
        test_cases = query.all()
        
        results = []
        for tc in test_cases:
            if tc.embedding:
                similarity = self.cosine_similarity(query_embedding, tc.embedding)
                # Only include results that meet minimum similarity threshold
                if similarity >= min_similarity:
                    results.append((tc.id, similarity))
        
        # Sort by similarity descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    
    def get_configured_model(self, db: Session) -> str:
        """Get the currently configured embedding model from database settings"""
        try:
            from app.models.models import ApplicationSetting
            setting = db.query(ApplicationSetting).filter(
                ApplicationSetting.key == "embedding_model"
            ).first()
            if setting and setting.value in SUPPORTED_MODELS:
                return setting.value
        except Exception as e:
            print(f"⚠️ Could not get configured model: {e}")
        return DEFAULT_MODEL
    
    async def preload_models(self, configured_model: str = None):
        """Background task to preload only the configured model at startup.
        
        To save memory, only the currently selected model is loaded.
        Other models are loaded on-demand when user switches to them.
        
        Args:
            configured_model: The model name to preload (from application settings).
                             Falls back to DEFAULT_MODEL if not specified.
        """
        # Determine which model to preload
        model_to_load = configured_model if configured_model else DEFAULT_MODEL
        
        print(f"🚀 Preloading configured embedding model: {model_to_load}")
        print(f"   (Other models will be loaded on-demand to save memory)")
        
        try:
            # Run in executor to not block
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._get_model, model_to_load)
            print(f"✅ Model preload complete: {model_to_load}")
        except Exception as e:
            print(f"⚠️ Failed to preload {model_to_load}: {e}")


# Singleton instance
embedding_service = EmbeddingService()


def get_embedding_service() -> EmbeddingService:
    """Get the singleton embedding service instance"""
    return embedding_service
