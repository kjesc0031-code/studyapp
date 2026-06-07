"""
Configuration management for StudyApp.
Loads settings from environment variables with sensible defaults.
Uses python-dotenv to load .env files for development.
"""

import os
from typing import List
from pathlib import Path

# ==================== Load .env file ====================
# Development でのみ .env ファイルを読み込み
from dotenv import load_dotenv

# プロジェクトルート階層の .env を読み込み
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

# ==================== Database Configuration ====================
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite:///./studyapp.db"
)

# ==================== API Server Configuration ====================
API_HOST: str = os.getenv(
    "API_HOST",
    "127.0.0.1"  # localhost のみ（本番の場合は環境変数で変更）
)

API_PORT: int = int(os.getenv(
    "API_PORT",
    "8080"
))

RELOAD: bool = os.getenv(
    "RELOAD",
    "true"
).lower() == "true"  # 開発: True, 本番: False（環境変数で設定）

# ==================== CORS Configuration ====================
# コンマ区切りでオリジンを指定、またはJSON形式のリスト
_cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000;http://localhost:8080;http://127.0.0.1:8080"
)

# カンマまたはスペースで区切られた文字列をリストに変換
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in _cors_origins_str.replace(",", ";").split(";")
    if origin.strip()
]

# ==================== Frontend Configuration ====================
FRONTEND_SERVER_PORT: int = int(os.getenv(
    "FRONTEND_SERVER_PORT",
    "3000"
))

FRONTEND_API_BASE_URL: str = os.getenv(
    "FRONTEND_API_BASE_URL",
    "http://localhost:8080"
)
