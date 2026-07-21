"""
Question ordering for quiz modes (random / weak-study).
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Callable, Dict, List, Literal, Sequence, TypeVar

from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.models import AnswerHistory, Question

T = TypeVar("T")


@dataclass
class QuestionAnswerStats:
	attempt_count: int = 0
	wrong_count: int = 0
	last_is_correct: bool | None = None


def fetch_answer_stats(db: Session, question_ids: Sequence[int]) -> Dict[int, QuestionAnswerStats]:
	if not question_ids:
		return {}

	active_filter = (
		AnswerHistory.question_id.in_(question_ids),
		AnswerHistory.deleted_at.is_(None),
	)

	agg_rows = (
		db.query(
			AnswerHistory.question_id,
			func.count(AnswerHistory.id).label("attempt_count"),
			func.sum(case((AnswerHistory.is_correct.is_(False), 1), else_=0)).label("wrong_count"),
		)
		.filter(*active_filter)
		.group_by(AnswerHistory.question_id)
		.all()
	)

	stats = {
		row.question_id: QuestionAnswerStats(
			attempt_count=row.attempt_count,
			wrong_count=row.wrong_count or 0,
		)
		for row in agg_rows
	}

	latest = (
		db.query(
			AnswerHistory.question_id,
			func.max(AnswerHistory.answered_at).label("last_at"),
		)
		.filter(*active_filter)
		.group_by(AnswerHistory.question_id)
		.subquery()
	)

	last_rows = (
		db.query(AnswerHistory.question_id, AnswerHistory.is_correct)
		.join(
			latest,
			and_(
				AnswerHistory.question_id == latest.c.question_id,
				AnswerHistory.answered_at == latest.c.last_at,
			),
		)
		.filter(AnswerHistory.deleted_at.is_(None))
		.all()
	)

	for row in last_rows:
		stats[row.question_id].last_is_correct = row.is_correct

	return stats


def classify_study_status(stats: QuestionAnswerStats | None) -> Literal["unanswered", "weak", "mastered"]:
	if stats is None or stats.attempt_count == 0:
		return "unanswered"
	if stats.wrong_count > 0:
		return "weak"
	return "mastered"


def _shuffle(items: List[T]) -> List[T]:
	shuffled = items[:]
	random.shuffle(shuffled)
	return shuffled


def _weighted_shuffle(items: List[T], weight_fn: Callable[[T], float]) -> List[T]:
	pool = items[:]
	result: List[T] = []
	while pool:
		total = sum(max(weight_fn(item), 0.0) for item in pool)
		if total <= 0:
			result.extend(_shuffle(pool))
			break

		threshold = random.uniform(0, total)
		cumulative = 0.0
		for index, item in enumerate(pool):
			cumulative += max(weight_fn(item), 0.0)
			if threshold <= cumulative:
				result.append(pool.pop(index))
				break
	return result


def _weak_weight(stats: QuestionAnswerStats) -> float:
	weight = 1.0 + stats.wrong_count * 2
	if stats.last_is_correct is False:
		weight += 3.0
	return weight


def order_questions_random(questions: Sequence[Question]) -> List[Question]:
	return _shuffle(list(questions))


def order_questions_for_study(
	questions: Sequence[Question],
	stats_by_id: Dict[int, QuestionAnswerStats],
) -> List[Question]:
	"""苦手学習向け: 不正解歴がある問題だけを、不正解が多いほど出やすく並べる。"""
	weak: List[Question] = []

	for question in questions:
		stats = stats_by_id.get(question.id)
		if stats is not None and stats.wrong_count > 0:
			weak.append(question)

	return _weighted_shuffle(weak, lambda q: _weak_weight(stats_by_id[q.id]))
