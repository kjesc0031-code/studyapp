"""
API endpoints for recording answer history.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app import models, schemas
from app.database import get_db
from app.models import AnswerHistory
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()


@router.post("/", response_model=schemas.AnswerRead)
def create_answer(answer: schemas.AnswerCreate, db: Session = Depends(get_db)):
	question = db.query(models.Question).filter(
		models.Question.id == answer.question_id
	).first()
	if question is None:
		raise HTTPException(status_code=404, detail="Question not found")

	is_correct = answer.selected_answer == question.correct_answer

	new_answer = AnswerHistory(
		question_id=answer.question_id,
		is_correct=is_correct,
		answered_at=datetime.utcnow()
	)

	try:
		db.add(new_answer)
		db.commit()
		db.refresh(new_answer)
		return new_answer
	except SQLAlchemyError:
		db.rollback()
		raise HTTPException(status_code=500, detail="Failed to create answer history.")
