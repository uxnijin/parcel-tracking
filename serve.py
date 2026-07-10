#!/usr/bin/env python3
"""Minimal static dev server for ShipFlow.

Serves the current directory with caching disabled so edits to HTML/CSS/JS are
always picked up on reload (the default python http.server lets browsers
heuristically cache assets, which makes changes appear not to take effect).
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
