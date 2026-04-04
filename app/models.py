"""
This file defines SQLAlchemy ORM models for a study app.

Design constraints:
- Single user only (no user table)
- Exam is a container of questions (e.g. 資格・試験単位)
- Question is the core learning unit
- Tag belongs to an Exam and classifies Questions
- Question and Tag have a many-to-many relationship
- AnswerHistory is append-only and stores correctness and timestamp
- Choices for a Question are stored as JSON
- SQLite is used

Models to define:
- Exam
- Question
- Tag
- AnswerHistory
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, JSON, UniqueConstraint, Table
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime


Base = declarative_base()


# Association table for Question and Tag many-to-many relationship
question_tags = Table(
    'question_tags',
    Base.metadata,
    Column('question_id', Integer, ForeignKey('questions.id', ondelete='RESTRICT'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='RESTRICT'), primary_key=True),
    Column('created_at', DateTime, default=datetime.utcnow, nullable=False),
)


class Exam(Base):
    """
    Exam represents a certification or exam unit (e.g., 資格・試験).
    
    Attributes:
        id: Primary key
        title: Exam title (e.g., "認定セキュアWebアプリケーション設計士試験")
        description: Optional description
        created_at: Timestamp when exam was created
        questions: Relationship to Question instances
        tags: Relationship to Tag instances
    """
    __tablename__ = 'exams'

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    questions = relationship('Question', back_populates='exam')
    tags = relationship('Tag', back_populates='exam')


class Tag(Base):
    """
    Tag belongs to an Exam and classifies Questions (e.g., "認証", "検証").
    Tags are scoped per Exam (same name can exist in different exams).
    
    Attributes:
        id: Primary key
        exam_id: Foreign key to Exam
        name: Tag name (unique within an exam)
        description: Optional description
        created_at: Timestamp when tag was created
        exam: Relationship to parent Exam
        questions: Many-to-many relationship to Questions
    """
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey('exams.id', ondelete='RESTRICT'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Unique constraint: same tag name cannot exist in the same exam
    __table_args__ = (UniqueConstraint('exam_id', 'name'), )

    # Relationships
    exam = relationship('Exam', back_populates='tags')
    questions = relationship(
        'Question',
        secondary=question_tags,
        back_populates='tags'
    )


class Question(Base):
    """
    Question is the core learning unit.
    
    Attributes:
        id: Primary key
        exam_id: Foreign key to Exam
        title: Question text
        description: Optional additional explanation
        choices: JSON object containing multiple choice options
        correct_answer: The correct answer (can be choice index, text, or other format)
        explanation: Explanation of the correct answer
        created_at: Timestamp when question was created
        exam: Relationship to parent Exam
        tags: Many-to-many relationship to Tags
        answer_histories: Relationship to AnswerHistory instances
    """
    __tablename__ = 'questions'

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey('exams.id', ondelete='RESTRICT'), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    choices = Column(JSON, nullable=False)  # JSON array of choices
    correct_answer = Column(String, nullable=False)  # Correct answer value
    explanation = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    exam = relationship('Exam', back_populates='questions')
    tags = relationship(
        'Tag',
        secondary=question_tags,
        back_populates='questions'
    )
    answer_histories = relationship('AnswerHistory', back_populates='question')


class AnswerHistory(Base):
    """
    AnswerHistory is append-only and records learning history.
    Supports soft delete via deleted_at field for future modifications.
    
    Attributes:
        id: Primary key
        question_id: Foreign key to Question
        is_correct: Boolean indicating if the answer was correct
        answered_at: Timestamp when the answer was submitted
        deleted_at: Soft delete timestamp (NULL = not deleted)
        created_at: Timestamp when this record was created
        question: Relationship to parent Question
    """
    __tablename__ = 'answer_histories'

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='RESTRICT'), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete: NULL = active
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    question = relationship('Question', back_populates='answer_histories')