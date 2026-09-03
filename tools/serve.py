#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""启动本地预览服务。

浏览器不允许 file:// 协议读取本地 .md / .json（CORS 限制），
所以必须通过 HTTP 访问。双击 start.bat 即可，无需手动执行本文件。
"""

import os
import sys
import socket
import webbrowser
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PORT = 8000


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def pick_port(start):
    for port in range(start, start + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if sock.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    port = pick_port(port)
    handler = functools.partial(QuietHandler, directory=ROOT)
    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        url = 'http://localhost:%d/' % port
        print('=' * 46)
        print('  博客已启动: %s' % url)
        print('  修改文件后刷新浏览器即可，无需重启')
        print('  按 Ctrl+C 停止')
        print('=' * 46)
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n已停止。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
