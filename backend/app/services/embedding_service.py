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
    
    def prepare_text_for_embedding(self, title: str, steps: str = None) -> str:
        """Prepare test case text for embedding generation"""
        text_parts = []
        
        if title:
            text_parts.append(title.strip())
        
        if steps:
            # Clean up steps text
            cleaned_steps = steps.strip()
            text_parts.append(cleaned_steps)
        
        return " ".join(text_parts)
    
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
    
    async def preload_models(self):
        """Background task to preload both models at startup"""
        print("🚀 Starting background model preload...")
        
        for model_name in SUPPORTED_MODELS.keys():
            try:
                # Run in executor to not block
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, self._get_model, model_name)
            except Exception as e:
                print(f"⚠️ Failed to preload {model_name}: {e}")
        
        print("✅ Model preload complete")


# Singleton instance
embedding_service = EmbeddingService()


def get_embedding_service() -> EmbeddingService:
    """Get the singleton embedding service instance"""
    return embedding_service
