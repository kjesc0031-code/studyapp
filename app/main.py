"""
FastAPI entry point for the study app.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

from app.routers import exam, question, answer, stats, tag
from app.config import CORS_ORIGINS

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

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
app.include_router(tag.router, prefix="/tags", tags=["Tag"])


def _inject_api_config(html: str) -> str:
	"""同一オリジンで API を呼び出すための設定を index.html に注入する。"""
	injection = """    <script>
        window.API_BASE_URL = "";
    </script>"""
	return html.replace("</head>", injection + "\n</head>")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/index.html", response_class=HTMLResponse, include_in_schema=False)
async def serve_frontend_index() -> str:
	content = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
	return _inject_api_config(content)


# CSS / JS など静的ファイル（"/" マウントは API ルートと競合するため個別に配信）
@app.get("/app.js", include_in_schema=False)
async def serve_app_js() -> FileResponse:
	return FileResponse(FRONTEND_DIR / "app.js", media_type="application/javascript")


@app.get("/styles.css", include_in_schema=False)
async def serve_styles_css() -> FileResponse:
	return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")
