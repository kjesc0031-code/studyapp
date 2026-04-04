## なぜ作るか
・認定セキュアWebアプリケーション設計士試験は過去問が存在せず、テキスト学習のみでは「試験で問われる観点」を把握しづらい。
そのため、自分で問題を作成・蓄積しながら理解度を可視化できる学習環境が必要だと感じた。

## 解決したい学習の問題
・過去問がない
・テキストを読んでも「出題されそうな粒度」が分からない
・社会人でまとまった時間が取りにくい
・何をどこまで理解したか把握できない
・そもそも単語が難しい
・かといってアプリをこの試験のためだけに作るのは無駄が多い

## 対象ユーザー（自分）

・自分1人で利用することを前提
・ログイン機能や権限管理は考慮しない
・データは1ユーザー前提で設計する

※ 将来的にチーム利用できる余地は残すが、MVPでは考えない

## MVPの機能
・学習機能
    ・クイズ演習
        ・問題
        ・選択肢 or 記述
        ・正答
        ・解説
    ・正誤を記録

・可視化
    ・全体正答率
    ・タグ別正答率

・管理系
    ・問題作成・編集
    ・タグ付け
    ・試験の切り替え（試験ID）

## 今回は作らない機能
・ブックマーク
・フラグ

## 補足方針
・「問題」と「単語（用語）」はどちらも学習素材として扱う
・単語は将来的に単語帳機能として独立可能な設計を想定する
・MVPでは単語は問題の一部（タグ・解説）として扱う

## このアプリの中心概念
・このアプリの中心は「問題（Question）」である
・学習の進捗や理解度は「問題に対する回答履歴」から算出する
・試験（Exam）やタグ（Tag）は、問題を整理・可視化するための補助概念とする

## 開発環境セットアップ

### 前提条件
- Python 3.9 以上
- Node.js (フロントエンドサーバー補助用)

### バックエンド（FastAPI）セットアップ

1. **リポジトリクローン＆依存パッケージのインストール**
   ```bash
   cd /path/to/studyapp
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   
   pip install -r requirements.txt
   ```

2. **環境変数ファイルの作成**
   ```bash
   # .env.example をコピーして .env を作成
   cp .env.example .env
   ```

   `.env` ファイルの内容例（開発環境）:
   ```
   DATABASE_URL=sqlite:///./studyapp.db
   API_HOST=127.0.0.1
   API_PORT=8080
   RELOAD=true
   CORS_ORIGINS=http://localhost:3000
   FRONTEND_SERVER_PORT=3000
   FRONTEND_API_BASE_URL=http://localhost:8080
   ```

3. **バックエンドサーバー起動**
   ```bash
   python app/main.py
   # または uvicorn を直接実行
   uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
   ```

   → API ドキュメント: `http://localhost:8080/docs`

### フロントエンド（Vanilla JavaScript）セットアップ

1. **フロントエンドサーバー起動**
   ```bash
   cd frontend
   python server.py
   ```

   → ブラウザで `http://localhost:3000` にアクセス

### 本番環境での注意事項

- **CORS_ORIGINS**: 環境変数で実際のドメインを指定する
  ```
  CORS_ORIGINS=https://yourdomain.com
  ```

- **API_HOST**: セキュリティ上、デフォルトは `127.0.0.1` (localhost のみ) です
  - ネットワーク経由でアクセスする場合は、`0.0.0.0` または特定の IP を指定

- **RELOAD**: 本番環境では `false` に設定
  ```
  RELOAD=false
  ```

- **DATABASE_URL**: 本番環境では PostgreSQL など別の DB を推奨
  ```
  DATABASE_URL=postgresql://user:password@localhost/dbname
  ```

