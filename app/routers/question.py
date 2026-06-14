"""
API endpoints for creating and retrieving questions.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Optional
from app import models, schemas
from app.csv_import import parse_questions_csv
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


def _get_or_create_tags(db: Session, exam_id: int, tag_names: List[str]) -> tuple[List[models.Tag], List[str]]:
	if not tag_names:
		return [], []

	existing = db.query(models.Tag).filter(
		models.Tag.exam_id == exam_id,
		models.Tag.name.in_(tag_names),
	).all()
	by_name: Dict[str, models.Tag] = {t.name: t for t in existing}

	created_names: List[str] = []
	tags: List[models.Tag] = []
	for name in tag_names:
		tag = by_name.get(name)
		if tag is None:
			tag = models.Tag(exam_id=exam_id, name=name)
			db.add(tag)
			db.flush()
			by_name[name] = tag
			created_names.append(name)
		tags.append(tag)

	return tags, created_names


@router.post("/import", response_model=schemas.QuestionImportResult)
async def import_questions_csv(
	exam_id: int = Form(...),
	file: UploadFile = File(...),
	db: Session = Depends(get_db),
):
	exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
	if exam is None:
		raise HTTPException(status_code=404, detail="Exam not found")

	raw = await file.read()
	for encoding in ("utf-8-sig", "utf-8", "cp932"):
		try:
			content = raw.decode(encoding)
			break
		except UnicodeDecodeError:
			content = None
	if content is None:
		raise HTTPException(status_code=400, detail="CSVの文字コードを判別できません（UTF-8 または Shift_JIS で保存してください）")

	parsed_rows, parse_errors = parse_questions_csv(content)
	errors = [schemas.ImportRowError(row=e.row, message=e.message) for e in parse_errors]
	imported = 0
	all_created_tags: List[str] = []

	for row_num, row in parsed_rows:
		nested = db.begin_nested()
		try:
			tags, created_names = _get_or_create_tags(db, exam_id, row.tag_names)
			all_created_tags.extend(created_names)

			db_question = models.Question(
				exam_id=exam_id,
				title=row.title,
				description=row.description,
				choices=row.choices,
				correct_answer=row.correct_answer,
				explanation=row.explanation,
			)
			db_question.tags = tags
			db.add(db_question)
			db.flush()
			nested.commit()
			imported += 1
		except Exception:
			nested.rollback()
			errors.append(schemas.ImportRowError(row=row_num, message="登録中にエラーが発生しました"))

	if imported > 0:
		db.commit()
	else:
		db.rollback()

	return schemas.QuestionImportResult(
		imported=imported,
		failed=len(errors),
		errors=errors,
		created_tags=sorted(set(all_created_tags)),
	)


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
