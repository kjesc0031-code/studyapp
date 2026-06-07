"""
API endpoints for managing tags.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=schemas.TagRead)
def create_tag(
	tag: schemas.TagCreate,
	db: Session = Depends(get_db)
):
	exam = db.query(models.Exam).filter(models.Exam.id == tag.exam_id).first()
	if exam is None:
		raise HTTPException(status_code=404, detail="Exam not found")

	existing = db.query(models.Tag).filter(
		models.Tag.exam_id == tag.exam_id,
		models.Tag.name == tag.name
	).first()
	if existing is not None:
		raise HTTPException(status_code=409, detail="Tag already exists for this exam")

	db_tag = models.Tag(
		exam_id=tag.exam_id,
		name=tag.name,
		description=tag.description
	)
	db.add(db_tag)
	db.commit()
	db.refresh(db_tag)
	return db_tag


@router.get("/", response_model=List[schemas.TagRead])
def read_tags(
	exam_id: Optional[int] = Query(None, description="Exam IDで絞り込み"),
	db: Session = Depends(get_db)
):
	if exam_id is not None:
		exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
		if exam is None:
			raise HTTPException(status_code=404, detail="Exam not found")

	query = db.query(models.Tag)
	if exam_id is not None:
		query = query.filter(models.Tag.exam_id == exam_id)
	return query.order_by(models.Tag.id).all()
