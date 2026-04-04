#!/usr/bin/env python3
"""
Development server for StudyApp frontend.
Serves static files with environment variable injection.
"""

import http.server
import socketserver
import os
from pathlib import Path
from app.config import FRONTEND_SERVER_PORT, FRONTEND_API_BASE_URL

PORT = FRONTEND_SERVER_PORT


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that injects environment variables into HTML."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

    def do_GET(self):
        # ルートアクセスの場合、index.html を返す
        if self.path == '/' or self.path == '':
            self.path = '/index.html'

        # index.html の場合、環境変数を注入
        if self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()

            # index.html を読みこみ、環境変数を注入
            index_path = Path(__file__).parent / 'index.html'
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 環境変数を注入（headセクション内）
            # グローバル変数として API_BASE_URL をセット
            injection = f"""    <!-- Environment configuration (injected by server) -->
    <script>
        window.API_BASE_URL = "{FRONTEND_API_BASE_URL}";
    </script>"""

            # </head> の前に挿入
            content = content.replace('</head>', injection + '\n</head>')

            self.wfile.write(content.encode('utf-8'))
            return

        # その他のファイル（CSS, JS等）は通常通り提供
        return super().do_GET()


if __name__ == '__main__':
    os.chdir(Path(__file__).parent)

    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Frontend server running at http://localhost:{PORT}")
        print(f"API Backend: {FRONTEND_API_BASE_URL}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

        httpd.serve_forever()
