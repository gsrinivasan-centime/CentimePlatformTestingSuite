"""
Background Tasks Service

Handles async background tasks like embedding generation for entities.
Uses FastAPI's BackgroundTasks for non-blocking operations.
"""

import logging
from typing import Optional, List
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.services.embedding_service import EmbeddingService, DEFAULT_MODEL

logger = logging.getLogger(__name__)

# Singleton embedding service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create singleton embedding service"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def compute_test_case_embedding(test_case_id: int):
    """
    Background task to compute/update embedding for a single test case.
    
    This function runs in a background thread and creates its own database session.
    """
    db = SessionLocal()
    try:
        from app.models.models import TestCase, Module
        
        test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
        if not test_case:
            logger.warning(f"[Embedding Task] Test case {test_case_id} not found")
            return
        
        # Get module name for embedding
        module_name = None
        if test_case.module_id:
            module = db.query(Module).filter(Module.id == test_case.module_id).first()
            if module:
                module_name = module.name
        
        # Prepare text for embedding
        embedding_service = get_embedding_service()
        text = embedding_service.prepare_text_for_embedding(
            title=test_case.title,
            steps=test_case.steps_to_reproduce,
            tag=test_case.tag.value if test_case.tag else None,
            test_type=test_case.test_type,
            module_name=module_name,
            sub_module=test_case.sub_module,
            expected_result=test_case.expected_result
        )
        
        if text:
            # Generate embedding
            embedding = embedding_service.generate_embedding(text, DEFAULT_MODEL)
            
            if embedding:
                # Store embedding in database
                test_case.embedding = embedding
                test_case.embedding_model = DEFAULT_MODEL  # Track which model was used
                db.commit()
                logger.info(f"[Embedding Task] ✅ Generated embedding for test case {test_case_id}: '{test_case.title[:50]}...'")
            else:
                logger.warning(f"[Embedding Task] Failed to generate embedding for test case {test_case_id}")
        else:
            logger.warning(f"[Embedding Task] No text content for test case {test_case_id}")
            
    except Exception as e:
        logger.error(f"[Embedding Task] Error computing embedding for test case {test_case_id}: {e}")
        db.rollback()
    finally:
        db.close()


def compute_issue_embedding(issue_id: int):
    """
    Background task to compute/update embedding for an issue.
    
    Note: Currently a placeholder. Issue model needs an embedding column to store vectors.
    """
    logger.info(f"[Embedding Task] Issue embedding not yet implemented (Issue model needs embedding column). Issue ID: {issue_id}")


def compute_jira_story_embedding(story_id: int):
    """
    Background task to compute/update embedding for a JIRA story.
    
    Note: Currently a placeholder. JiraStory model needs an embedding column to store vectors.
    """
    logger.info(f"[Embedding Task] JIRA story embedding not yet implemented (JiraStory model needs embedding column). Story ID: {story_id}")


def compute_batch_embeddings(entity_type: str, entity_ids: List[int]):
    """
    Background task to compute embeddings for multiple entities.
    Useful for bulk operations.
    """
    logger.info(f"[Embedding Task] Starting batch embedding for {len(entity_ids)} {entity_type}(s)")
    
    if entity_type == "test_case":
        for entity_id in entity_ids:
            compute_test_case_embedding(entity_id)
    elif entity_type == "issue":
        for entity_id in entity_ids:
            compute_issue_embedding(entity_id)
    elif entity_type == "jira_story":
        for entity_id in entity_ids:
            compute_jira_story_embedding(entity_id)
    else:
        logger.warning(f"[Embedding Task] Unknown entity type: {entity_type}")
    
    logger.info(f"[Embedding Task] ✅ Completed batch embedding for {len(entity_ids)} {entity_type}(s)")
