import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest

from serve import GalleryServer, apply_order


class OrderTests(unittest.TestCase):
    def test_preserves_video_content_and_source_order(self):
        videos = [{"id": "a", "title": "Keep", "links": [{"url": "https://example.com"}]}, {"id": "b"}]
        order = [{"id": "b", "pinned": True, "sortWeight": 2}, {"id": "a", "pinned": False, "sortWeight": -1}]
        result = apply_order(videos, order)
        self.assertEqual([v["id"] for v in result], ["a", "b"])
        self.assertEqual(result[0]["links"], videos[0]["links"])
        self.assertEqual(result[0]["title"], "Keep")
        self.assertNotIn("pinned", videos[0])

    def test_rejects_invalid_or_incomplete_orders(self):
        valid = {"id": "a", "pinned": False, "sortWeight": 0}
        cases = [None, [], [dict(valid, id="b")], [dict(valid, pinned=1)],
                 [dict(valid, sortWeight=True)], [dict(valid, sortWeight=1.2)],
                 [dict(valid, sortWeight=1000000)], [dict(valid, sortWeight="10")]]
        for order in cases:
            with self.subTest(order=order), self.assertRaises(ValueError):
                apply_order([{"id": "a"}], order)
        with self.assertRaises(ValueError):
            apply_order([{"id": "a"}, {"id": "b"}], [valid, valid])


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "videos.json"
        self.original = b'[{"id":"a","title":"Original","category":"test"}]\n'
        self.path.write_bytes(self.original)
        self.server = GalleryServer(("127.0.0.1", 0), self.path)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.host = f"127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, method="GET", payload=None, headers=None):
        connection = http.client.HTTPConnection(self.host)
        connection.request(method, "/api/video-order", body=json.dumps(payload) if payload is not None else None,
                           headers=headers or {})
        response = connection.getresponse()
        result = response.status, json.loads(response.read())
        connection.close()
        return result

    def test_save_persists_and_rejects_stale_revision(self):
        status, session = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(session["videos"][0]["title"], "Original")
        headers = {"Content-Type": "application/json", "X-Editor-Token": session["token"], "Origin": f"http://{self.host}"}
        payload = {"revision": session["revision"], "order": [{"id": "a", "pinned": True, "sortWeight": 42}]}
        self.assertEqual(self.request("POST", payload, headers)[0], 200)
        saved = json.loads(self.path.read_text())
        self.assertEqual(saved[0]["sortWeight"], 42)
        self.assertTrue(saved[0]["pinned"])
        self.assertEqual(saved[0]["title"], "Original")
        self.assertEqual(self.request("POST", payload, headers)[0], 409)

    def test_unauthorized_or_invalid_request_never_writes(self):
        _, session = self.request()
        headers = {"Content-Type": "application/json", "X-Editor-Token": session["token"]}
        self.assertEqual(self.request("POST", {}, {})[0], 403)
        self.assertEqual(self.request("POST", {}, dict(headers, Origin="https://evil.example"))[0], 403)
        self.assertEqual(self.request(headers={"Host": "evil.example"})[0], 403)
        self.assertEqual(self.request("POST", {"revision": session["revision"], "order": []}, headers)[0], 400)
        self.assertEqual(self.path.read_bytes(), self.original)


if __name__ == "__main__":
    unittest.main()
