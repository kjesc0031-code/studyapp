

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
from app.config import DATABASE_URL

# SQLiteファイルのパス（環境変数から読み込み）
SQLALCHEMY_DATABASE_URL = DATABASE_URL

# エンジン作成（check_same_thread=FalseはSQLiteのFastAPI/Flask等での推奨設定）
engine = create_engine(
	SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# セッションファクトリ
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# テーブル自動生成（初回起動時用）
Base.metadata.create_all(bind=engine)

# セッション取得用の依存関数（FastAPI等で利用）
def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
