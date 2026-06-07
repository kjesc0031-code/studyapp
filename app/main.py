"""
FastAPI entry point for the study app.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db
from app.routers import exam, question, answer, stats
from app.config import CORS_ORIGINS

app = FastAPI(
	title="Study App",
	description="自作問題で学習進捗・理解度を可視化する学習アプリ (認定セキュアWebアプリケーション設計士試験向けMVP)",
	version="0.1.0"
)

# CORS設定（環境変数から読み込み: 開発=localhost:3000, 本番=環境変数で指定）
app.add_middleware(
	CORSMiddleware,
	allow_origins=CORS_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# ルーター登録
app.include_router(exam.router, prefix="/exams", tags=["Exam"])
app.include_router(question.router, prefix="/questions", tags=["Question"])
app.include_router(answer.router, prefix="/answers", tags=["Answer"])
app.include_router(stats.router, prefix="/stats", tags=["Stats"])

# 開発用エントリポイント
if __name__ == "__main__":
	import sys
	import os
	from pathlib import Path
	
	# プロジェクトルートをPythonパスに追加
	project_root = Path(__file__).parent.parent
	sys.path.insert(0, str(project_root))
	
	import uvicorn
	from app.config import API_HOST, API_PORT, RELOAD
	uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=RELOAD)
