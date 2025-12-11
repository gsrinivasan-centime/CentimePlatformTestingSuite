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
    Uses raw SQL for storing embedding to handle pgvector type casting correctly.
    """
    from sqlalchemy import text
    
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
        text_content = embedding_service.prepare_text_for_embedding(
            title=test_case.title,
            steps=test_case.steps_to_reproduce,
            tag=test_case.tag.value if test_case.tag else None,
            test_type=test_case.test_type,
            module_name=module_name,
            sub_module=test_case.sub_module,
            expected_result=test_case.expected_result
        )
        
        if text_content:
            # Generate embedding
            embedding = embedding_service.generate_embedding(text_content, DEFAULT_MODEL)
            
            if embedding:
                # Store embedding using raw SQL with proper pgvector casting
                # Convert embedding list to string format: '[0.1, 0.2, ...]'
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                
                # Use raw SQL with ::vector cast to properly store pgvector data
                # NOTE: We embed the vector string directly in SQL because SQLAlchemy's
                # :param binding conflicts with PostgreSQL's :: cast operator
                sql = text(f"""
                    UPDATE test_cases 
                    SET embedding = '{embedding_str}'::vector(384),
                        embedding_model = :model
                    WHERE id = :id
                """)
                db.execute(sql, {
                    'model': DEFAULT_MODEL,
                    'id': test_case_id
                })
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
    
    This function runs in a background thread and creates its own database session.
    Optimized for semantic search queries like:
    - "Show issues in payments module"
    - "Show issues reported by John"
    - "Show critical issues assigned to me"
    """
    db = SessionLocal()
    try:
        from app.models.models import Issue, Module, User
        
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            logger.warning(f"[Embedding Task] Issue {issue_id} not found")
            return
        
        # Get module name for embedding
        module_name = None
        if issue.module_id:
            module = db.query(Module).filter(Module.id == issue.module_id).first()
            if module:
                module_name = module.name
        
        # Get reporter name
        reporter_name = issue.reporter_name
        if not reporter_name and issue.created_by:
            creator = db.query(User).filter(User.id == issue.created_by).first()
            if creator:
                reporter_name = creator.full_name or creator.email
        
        # Get assignee name
        assignee_name = issue.jira_assignee_name
        if not assignee_name and issue.assigned_to:
            assignee = db.query(User).filter(User.id == issue.assigned_to).first()
            if assignee:
                assignee_name = assignee.full_name or assignee.email
        
        # Prepare text for embedding
        embedding_service = get_embedding_service()
        text = embedding_service.prepare_issue_text_for_embedding(
            title=issue.title,
            description=issue.description,
            module_name=module_name,
            status=issue.status,
            priority=issue.priority,
            severity=issue.severity,
            reporter_name=reporter_name,
            assignee_name=assignee_name,
            jira_story_id=issue.jira_story_id
        )
        
        if text:
            # Generate embedding
            embedding = embedding_service.generate_embedding(text, DEFAULT_MODEL)
            
            if embedding:
                # Store embedding using raw SQL with proper pgvector casting
                # Convert embedding list to string format: '[0.1, 0.2, ...]'
                from sqlalchemy import text as sql_text
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                
                # Use raw SQL with ::vector cast to properly store pgvector data
                # NOTE: We embed the vector string directly in SQL because SQLAlchemy's
                # :param binding conflicts with PostgreSQL's :: cast operator
                sql = sql_text(f"""
                    UPDATE issues 
                    SET embedding = '{embedding_str}'::vector(384),
                        embedding_model = :model
                    WHERE id = :id
                """)
                db.execute(sql, {
                    'model': DEFAULT_MODEL,
                    'id': issue_id
                })
                db.commit()
                logger.info(f"[Embedding Task] ✅ Generated embedding for issue {issue_id}: '{issue.title[:50]}...'")
            else:
                logger.warning(f"[Embedding Task] Failed to generate embedding for issue {issue_id}")
        else:
            logger.warning(f"[Embedding Task] No text content for issue {issue_id}")
            
    except Exception as e:
        logger.error(f"[Embedding Task] Error computing embedding for issue {issue_id}: {e}")
        db.rollback()
    finally:
        db.close()


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


def send_slack_issue_notification(issue_id: int, assignee_email: str, assignee_name: str, frontend_url: str):
    """
    Background task to send Slack DM notification when an issue is assigned.
    
    This function runs in a background thread and creates its own database session.
    It looks up the assignee by email (or name as fallback) in Slack and sends them a rich DM.
    
    Args:
        issue_id: ID of the issue that was assigned
        assignee_email: Email address of the assignee (may be empty)
        assignee_name: Display name of the assignee (used for fallback lookup)
        frontend_url: Base URL of the frontend for building portal links
    """
    from app.services.slack_service import slack_service
    
    logger.info(f"[Slack Notification] Starting notification for issue {issue_id}, email: {assignee_email}, name: {assignee_name}")
    
    db = SessionLocal()
    try:
        from app.models.models import Issue, Release
        
        # Fetch issue details
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            logger.warning(f"[Slack Notification] Issue {issue_id} not found")
            return
        
        # Get release name if available
        release_name = None
        if issue.release_id:
            release = db.query(Release).filter(Release.id == issue.release_id).first()
            if release:
                release_name = release.name
        
        # Build portal URL - link to issue within release management
        portal_url = f"{frontend_url}/releases"
        if issue.release_id:
            portal_url = f"{frontend_url}/releases/{issue.release_id}/issues"
        
        # Send Slack notification (will try email first, then name lookup)
        success = slack_service.notify_issue_assigned(
            assignee_email=assignee_email,
            assignee_name=assignee_name,
            issue_title=issue.title,
            issue_description=issue.description,
            priority=issue.priority or "Medium",
            release_name=release_name,
            portal_url=portal_url
        )
        
        if success:
            logger.info(f"[Slack Notification] ✅ Sent notification for issue {issue_id} to {assignee_name} ({assignee_email})")
        else:
            logger.warning(f"[Slack Notification] Failed to notify {assignee_name} ({assignee_email}) for issue {issue_id}")
            
    except Exception as e:
        logger.error(f"[Slack Notification] Error sending notification for issue {issue_id}: {e}")
    finally:
        db.close()
