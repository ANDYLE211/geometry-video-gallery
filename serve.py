"""Local-only maintenance server for the static gallery."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import tempfile
import threading


ROOT = Path(__file__).resolve().parent
VIDEOS = ROOT / "data" / "videos.json"


def revision(content):
    return hashlib.sha256(content).hexdigest()


def apply_order(videos, order):
    if not isinstance(order, list) or len(order) != len(videos):
        raise ValueError("视频列表已变化，请刷新页面后重试")
    updates = {}
    for item in order:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            raise ValueError("无效的视频记录")
        video_id = item["id"]
        if video_id in updates:
            raise ValueError("视频 ID 重复")
        if type(item.get("pinned")) is not bool:
            raise ValueError("置顶状态必须为布尔值")
        weight = item.get("sortWeight")
        if type(weight) is not int or not -999999 <= weight <= 999999:
            raise ValueError("权重必须是 -999999 到 999999 之间的整数")
        updates[video_id] = item
    if set(updates) != {video["id"] for video in videos}:
        raise ValueError("视频列表已变化，请刷新页面后重试")
    return [dict(video, pinned=updates[video["id"]]["pinned"],
                 sortWeight=updates[video["id"]]["sortWeight"]) for video in videos]


class GalleryServer(ThreadingHTTPServer):
    def __init__(self, address, data_path=VIDEOS):
        super().__init__(address, GalleryHandler)
        self.data_path = Path(data_path)
        self.token = secrets.token_urlsafe(32)
        self.save_lock = threading.Lock()


class GalleryHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, data):
        content = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def trusted_request(self):
        port = self.server.server_port
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        host = self.headers.get("Host")
        origin = self.headers.get("Origin")
        return host in hosts and (origin is None or origin == f"http://{host}")

    def do_GET(self):
        if not self.trusted_request():
            self.send_json(403, {"error": "仅允许本地同源访问"})
            return
        if self.path != "/api/video-order":
            super().do_GET()
            return
        try:
            with self.server.save_lock:
                content = self.server.data_path.read_bytes()
            self.send_json(200, {"token": self.server.token, "revision": revision(content),
                                 "videos": json.loads(content)})
        except (OSError, ValueError):
            self.send_json(500, {"error": "无法读取视频数据"})

    def do_POST(self):
        if self.path != "/api/video-order":
            self.send_json(404, {"error": "接口不存在"})
            return
        if not self.trusted_request() or not secrets.compare_digest(
                self.headers.get("X-Editor-Token", ""), self.server.token):
            self.send_json(403, {"error": "仅允许本地排序编辑器保存"})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(415, {"error": "请提交 JSON 数据"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 1024 * 1024:
                raise ValueError("提交内容大小无效")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("提交内容必须为对象")
            with self.server.save_lock:
                content = self.server.data_path.read_bytes()
                if payload.get("revision") != revision(content):
                    self.send_json(409, {"error": "视频数据已被修改，请刷新页面后重新编辑"})
                    return
                updated = apply_order(json.loads(content), payload.get("order"))
                # Replace atomically so an interrupted save never truncates the data file.
                temp_path = None
                try:
                    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                                     dir=self.server.data_path.parent, delete=False) as handle:
                        temp_path = handle.name
                        json.dump(updated, handle, ensure_ascii=False, indent=2)
                        handle.write("\n")
                    os.replace(temp_path, self.server.data_path)
                finally:
                    if temp_path and os.path.exists(temp_path):
                        os.unlink(temp_path)
            self.send_json(200, {"saved": True})
        except (ValueError, UnicodeError) as error:
            self.send_json(400, {"error": str(error)})
        except OSError:
            self.send_json(500, {"error": "写入失败，请检查文件权限"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    server = GalleryServer(("127.0.0.1", args.port))
    print(f"预览: http://127.0.0.1:{args.port}/", flush=True)
    print(f"排序编辑: http://127.0.0.1:{args.port}/?edit=1#works", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
