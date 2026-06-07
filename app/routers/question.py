"""
API endpoints for creating and retrieving questions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app import models, schemas
from app.database import get_db

router = APIRouter()


def _get_tags_for_question(db: Session, exam_id: int, tag_ids: List[int]) -> List[models.Tag]:
	if not tag_ids:
		return []

	tags = db.query(models.Tag).filter(
		models.Tag.id.in_(tag_ids),
		models.Tag.exam_id == exam_id
	).all()

	if len(tags) != len(set(tag_ids)):
		raise HTTPException(status_code=400, detail="One or more tags not found for this exam")

	return tags


@router.post("/", response_model=schemas.QuestionRead)
def create_question(
	question: schemas.QuestionCreate,
	db: Session = Depends(get_db)
):
	exam = db.query(models.Exam).filter(models.Exam.id == question.exam_id).first()
	if exam is None:
		raise HTTPException(status_code=404, detail="Exam not found")

	tags = _get_tags_for_question(db, question.exam_id, question.tag_ids or [])

	db_question = models.Question(
		exam_id=question.exam_id,
		title=question.title,
		description=question.description,
		choices=question.choices,
		correct_answer=question.correct_answer,
		explanation=question.explanation
	)
	db_question.tags = tags
	db.add(db_question)
	db.commit()
	db.refresh(db_question)
	return db_question


@router.get("/", response_model=List[schemas.QuestionRead])
def read_questions(
	exam_id: Optional[int] = Query(None, description="Exam IDで絞り込み"),
	db: Session = Depends(get_db)
):
	if exam_id is not None:
		exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
		if exam is None:
			raise HTTPException(status_code=404, detail="Exam not found")

	query = db.query(models.Question).options(joinedload(models.Question.tags))
	if exam_id is not None:
		query = query.filter(models.Question.exam_id == exam_id)
	return query.order_by(models.Question.id).all()
