# -*- coding: utf-8 -*-
"""
极简演示服务器：服务已构建的前端 dist/，并把 /api 反向代理到 FastAPI 后端。
用途：绕开 vite 开发服务器被占用端口的问题，提供一个稳定的本地预览入口。
运行：python serve_demo.py
"""
import os
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIST = r"E:\ai产物\2026-08-10-09-50-00\企业微信会话存档看板\frontend\dist"
UPSTREAM = "http://127.0.0.1:8000"
PORT = 8899


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIST, **k)

    def _copy_headers(self, req):
        for h in ("Authorization", "Content-Type", "Accept"):
            if h in self.headers:
                req.add_header(h, self.headers[h])

    def _proxy(self):
        target = UPSTREAM + self.path
        try:
            req = urllib.request.Request(target, method=self.command)
            self._copy_headers(req)
            if self.command == "POST":
                length = int(self.headers.get("Content-Length", 0) or 0)
                req.data = self.rfile.read(length) if length else None
            resp = urllib.request.urlopen(req, timeout=30)
            data = resp.read()
            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() in ("transfer-encoding", "connection"):
                    continue
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:  # noqa
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(("proxy error: " + str(e)).encode("utf-8"))

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy()
            return
        if self.path != "/" and not os.path.exists(
            os.path.join(DIST, self.path.lstrip("/").split("?")[0])
        ):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy()
            return
        self.send_error(405)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.makedirs(DIST, exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Demo 预览: http://127.0.0.1:{PORT}  (后端 -> {UPSTREAM})")
    srv.serve_forever()
