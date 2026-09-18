#!/usr/bin/env python3
"""Static file server + WebRTC signaling mailbox. Stdlib only.

  GET  /signal/<room>?since=N&me=ID  -> {"seq": latest, "msgs": [...]}
  POST /signal/<room>  body JSON {"from": ID, "to": ID?, ...}

Messages are kept in memory (last 500 per room). Peers poll every ~500 ms.
Once a WebRTC connection is up the server is no longer needed for sync.
"""
import json, os, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
rooms = {}
lock = threading.Lock()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if args and '/signal/' in str(args[0]):
            return
        super().log_message(fmt, *args)

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith('/signal/'):
            return super().do_GET()
        room = u.path[len('/signal/'):]
        q = parse_qs(u.query)
        since = int(q.get('since', ['0'])[0])
        me = q.get('me', [''])[0]
        with lock:
            r = rooms.setdefault(room, {'seq': 0, 'msgs': []})
            out = [m for s, m in r['msgs']
                   if s > since and m.get('from') != me and (not m.get('to') or m['to'] == me)]
            seq = r['seq']
        self._json({'seq': seq, 'msgs': out})

    def do_POST(self):
        u = urlparse(self.path)
        if not u.path.startswith('/signal/'):
            return self.send_error(404)
        n = int(self.headers.get('Content-Length', 0))
        try:
            body = json.loads(self.rfile.read(n) or b'{}')
        except ValueError:
            return self.send_error(400)
        with lock:
            r = rooms.setdefault(u.path[len('/signal/'):], {'seq': 0, 'msgs': []})
            r['seq'] += 1
            r['msgs'].append((r['seq'], body))
            del r['msgs'][:-500]
        self._json({'ok': True, 'seq': r['seq']})

    def _json(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    bind = os.environ.get('BIND', '0.0.0.0')
    print(f'serving {ROOT} on http://{bind}:{port}', flush=True)
    ThreadingHTTPServer((bind, port), Handler).serve_forever()
