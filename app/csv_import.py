"""
CSV parsing utilities for bulk question import.
"""
import csv
import io
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

CHOICE_COLUMN_PATTERN = re.compile(r"^choice\d+$", re.IGNORECASE)


@dataclass
class ParsedQuestionRow:
	title: str
	description: Optional[str]
	choices: List[str]
	correct_answer: str
	explanation: str
	tag_names: List[str]


@dataclass
class RowParseError:
	row: int
	message: str


def _split_tags(raw: str) -> List[str]:
	if not raw or not raw.strip():
		return []
	parts = re.split(r"[|｜]", raw)
	return [p.strip() for p in parts if p.strip()]


def _get_choice_columns(fieldnames: List[str]) -> List[str]:
	return sorted(
		[f for f in fieldnames if CHOICE_COLUMN_PATTERN.match(f)],
		key=lambda name: int(name[6:]),
	)


def _extract_choices(row: Dict[str, str], fieldnames: List[str]) -> List[str]:
	choices_raw = (row.get("choices") or "").strip()
	if choices_raw:
		return [c.strip() for c in re.split(r"[|｜]", choices_raw) if c.strip()]

	choices = []
	for col in _get_choice_columns(fieldnames):
		value = (row.get(col) or "").strip()
		if value:
			choices.append(value)
	return choices


def parse_questions_csv(content: str) -> Tuple[List[Tuple[int, ParsedQuestionRow]], List[RowParseError]]:
	"""
	Parse CSV content into question rows.

	Expected columns:
	- title (required)
	- description (optional)
	- choice1..choiceN OR choices (pipe-separated, required, min 2)
	- correct_answer (required, must match a choice)
	- explanation (required)
	- tags (optional, pipe-separated tag names)
	"""
	reader = csv.DictReader(io.StringIO(content))
	if not reader.fieldnames:
		return [], [RowParseError(row=1, message="CSVヘッダーが見つかりません")]

	normalized_fields = {f.strip().lower(): f for f in reader.fieldnames if f}
	required = ["title", "correct_answer", "explanation"]
	missing = [col for col in required if col not in normalized_fields]
	if missing:
		return [], [RowParseError(row=1, message=f"必須列がありません: {', '.join(missing)}")]

	has_choices_col = "choices" in normalized_fields
	has_choice_cols = any(CHOICE_COLUMN_PATTERN.match(f) for f in normalized_fields)
	if not has_choices_col and not has_choice_cols:
		return [], [RowParseError(row=1, message="選択肢列（choice1 など）または choices 列が必要です")]

	parsed: List[Tuple[int, ParsedQuestionRow]] = []
	errors: List[RowParseError] = []

	for row_num, raw_row in enumerate(reader, start=2):
		if not any((v or "").strip() for v in raw_row.values()):
			continue

		row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items() if k}

		title = row.get("title", "")
		if not title:
			errors.append(RowParseError(row=row_num, message="問題文（title）が空です"))
			continue

		choices = _extract_choices(row, list(normalized_fields.keys()))
		if len(choices) < 2:
			errors.append(RowParseError(row=row_num, message="選択肢は2つ以上必要です"))
			continue

		correct_answer = row.get("correct_answer", "")
		if not correct_answer:
			errors.append(RowParseError(row=row_num, message="正答（correct_answer）が空です"))
			continue
		if correct_answer not in choices:
			errors.append(RowParseError(row=row_num, message="正答が選択肢のいずれとも一致しません"))
			continue

		explanation = row.get("explanation", "")
		if not explanation:
			errors.append(RowParseError(row=row_num, message="解説（explanation）が空です"))
			continue

		description = row.get("description") or None
		tag_names = _split_tags(row.get("tags", ""))

		parsed.append((row_num, ParsedQuestionRow(
			title=title,
			description=description,
			choices=choices,
			correct_answer=correct_answer,
			explanation=explanation,
			tag_names=tag_names,
		)))

	return parsed, errors
