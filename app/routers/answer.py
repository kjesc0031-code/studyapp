"""
API endpoints for recording answer history.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app import models, schemas
from app.database import get_db
from app.models import AnswerHistory
from app.schemas import AnswerCreate, AnswerRead
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()

@router.post("/", response_model=schemas.AnswerRead)
def create_answer(answer: schemas.AnswerCreate, db: Session = Depends(get_db)):
    """
    Create a new answer history record.

    Args:
        answer (schemas.AnswerCreate): The answer data.
        db (Session): The database session.

    Returns:
        schemas.AnswerRead: The created answer history record.
    """
    new_answer = AnswerHistory(
        question_id=answer.question_id,
        is_correct=answer.is_correct,
        answered_at=datetime.utcnow()
    )

    try:
        db.add(new_answer)
        db.commit()
        db.refresh(new_answer)
        return new_answer
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create answer history.")
