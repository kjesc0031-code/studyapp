"""
API endpoints for creating and retrieving questions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=schemas.QuestionRead)
def create_question(
	question: schemas.QuestionCreate,
	db: Session = Depends(get_db)
):
	db_question = models.Question(
		exam_id=question.exam_id,
		title=question.title,
		description=question.description,
		choices=question.choices,
		correct_answer=question.correct_answer,
		explanation=question.explanation
	)
	db.add(db_question)
	db.commit()
	db.refresh(db_question)
	return db_question


@router.get("/", response_model=List[schemas.QuestionRead])
def read_questions(
	exam_id: Optional[int] = Query(None, description="Exam IDで絞り込み"),
	db: Session = Depends(get_db)
):
	query = db.query(models.Question)
	if exam_id is not None:
		query = query.filter(models.Question.exam_id == exam_id)
	return query.order_by(models.Question.id).all()