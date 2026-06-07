#!/usr/bin/env python3
"""
Study App 開発サーバー起動スクリプト。
API とフロントエンドを 1 つのプロセスで起動する。
"""

import sys
import threading
import time
import webbrowser
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


def _open_browser(url: str) -> None:
	time.sleep(1.5)
	webbrowser.open(url)


def main() -> None:
	from app.config import API_HOST, API_PORT, RELOAD

	host_label = "localhost" if API_HOST in ("127.0.0.1", "0.0.0.0") else API_HOST
	url = f"http://{host_label}:{API_PORT}"

	print("=" * 50)
	print("  Study App")
	print("=" * 50)
	print(f"  App:  {url}")
	print(f"  API:  {url}/docs")
	print("  Stop: Ctrl+C")
	print("=" * 50)

	threading.Thread(target=_open_browser, args=(url,), daemon=True).start()

	import uvicorn

	uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=RELOAD)


if __name__ == "__main__":
	main()
