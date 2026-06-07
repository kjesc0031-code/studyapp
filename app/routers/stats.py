"""
API endpoints for statistics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import AnswerHistory, Question, Tag
from app.schemas import OverallStats, TagStats

router = APIRouter()


@router.get("/overall", response_model=OverallStats, summary="Get overall accuracy")
def get_overall_accuracy(exam_id: int = Query(...), db: Session = Depends(get_db)):
	total = db.query(AnswerHistory).join(Question, AnswerHistory.question_id == Question.id).filter(Question.exam_id == exam_id).count()
	correct = db.query(AnswerHistory).join(Question, AnswerHistory.question_id == Question.id).filter(Question.exam_id == exam_id, AnswerHistory.is_correct == True).count()

	if total == 0:
		return OverallStats(total=0, correct=0, accuracy=0.0)

	accuracy = correct / total
	return OverallStats(total=total, correct=correct, accuracy=accuracy)


@router.get("/by-tag", response_model=List[TagStats], summary="Get accuracy by tag")
def get_accuracy_by_tag(exam_id: int = Query(...), db: Session = Depends(get_db)):
	results = (
		db.query(
			Tag.name,
			func.count(AnswerHistory.id).label("total"),
			func.sum(case((AnswerHistory.is_correct == True, 1), else_=0)).label("correct")
		)
		.join(Question, AnswerHistory.question_id == Question.id)
		.join(Tag, Question.tags)
		.filter(Question.exam_id == exam_id)
		.group_by(Tag.id, Tag.name)
		.all()
	)

	if not results:
		return []

	response = []
	for tag_name, total, correct in results:
		accuracy = correct / total if total > 0 else 0.0
		response.append(TagStats(tag=tag_name, total=total, correct=correct, accuracy=accuracy))

	return response
