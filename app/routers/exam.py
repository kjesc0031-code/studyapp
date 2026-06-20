"""
API endpoints for managing exams.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=schemas.ExamRead)
def create_exam(
	exam: schemas.ExamCreate,
	db: Session = Depends(get_db)
):
	db_exam = models.Exam(
		title=exam.title,
		description=exam.description
	)
	db.add(db_exam)
	db.commit()
	db.refresh(db_exam)
	return db_exam


@router.get("/", response_model=List[schemas.ExamRead])
def read_exams(db: Session = Depends(get_db)):
	return db.query(models.Exam).order_by(models.Exam.id).all()


@router.get("/{exam_id}", response_model=schemas.ExamRead)
def read_exam(exam_id: int, db: Session = Depends(get_db)):
	db_exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
	if db_exam is None:
		raise HTTPException(status_code=404, detail="Exam not found")
	return db_exam


@router.delete("/{exam_id}", status_code=204)
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
	exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
	if exam is None:
		raise HTTPException(status_code=404, detail="Exam not found")

	try:
		question_ids = [q.id for q in exam.questions]
		if question_ids:
			db.query(models.AnswerHistory).filter(
				models.AnswerHistory.question_id.in_(question_ids)
			).delete(synchronize_session=False)
			db.execute(
				models.question_tags.delete().where(
					models.question_tags.c.question_id.in_(question_ids)
				)
			)
			db.query(models.Question).filter(
				models.Question.exam_id == exam_id
			).delete(synchronize_session=False)

		db.query(models.Tag).filter(models.Tag.exam_id == exam_id).delete(synchronize_session=False)
		db.query(models.Exam).filter(models.Exam.id == exam_id).delete(synchronize_session=False)
		db.commit()
	except Exception:
		db.rollback()
		raise
