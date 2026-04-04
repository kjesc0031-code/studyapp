from typing import List, Optional, Any
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


class QuestionBase(BaseModel):
	exam_id: int
	title: str
	description: Optional[str] = None
	choices: List[Any]
	correct_answer: str
	explanation: str


class QuestionCreate(QuestionBase):
	pass


class QuestionRead(QuestionBase):
	id: int
	created_at: datetime

	class Config:
		from_attributes = True

class AnswerCreate(BaseModel):
    question_id: int
    is_correct: bool


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