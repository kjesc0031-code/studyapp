from typing import List, Optional, Any, Literal
from pydantic import BaseModel
from datetime import datetime


class ExamBase(BaseModel):
	title: str
	description: Optional[str] = None


class ExamCreate(ExamBase):
	pass


class ExamRead(ExamBase):
	id: int
	created_at: datetime

	class Config:
		from_attributes = True


class TagBase(BaseModel):
	exam_id: int
	name: str
	description: Optional[str] = None


class TagCreate(TagBase):
	pass


class TagRead(TagBase):
	id: int
	created_at: datetime

	class Config:
		from_attributes = True


class QuestionBase(BaseModel):
	exam_id: int
	title: str
	description: Optional[str] = None
	choices: List[Any]
	correct_answer: str
	explanation: str


class QuestionCreate(QuestionBase):
	tag_ids: Optional[List[int]] = []


class QuestionRead(QuestionBase):
	id: int
	created_at: datetime
	tags: List[TagRead] = []
	study: Optional["QuestionStudyInfo"] = None

	class Config:
		from_attributes = True


class QuestionStudyInfo(BaseModel):
	status: Literal["unanswered", "weak", "mastered"]
	attempt_count: int = 0
	wrong_count: int = 0
	last_is_correct: Optional[bool] = None


class ImportRowError(BaseModel):
	row: int
	message: str


class QuestionImportResult(BaseModel):
	imported: int
	failed: int
	errors: List[ImportRowError]
	created_tags: List[str] = []


class AnswerCreate(BaseModel):
	question_id: int
	selected_answer: str


class AnswerRead(BaseModel):
	id: int
	question_id: int
	is_correct: bool
	answered_at: datetime

	class Config:
		from_attributes = True


class OverallStats(BaseModel):
	total: int
	correct: int
	accuracy: float


class TagStats(BaseModel):
	tag: str
	total: int
	correct: int
	accuracy: float
