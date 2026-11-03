from html.parser import HTMLParser
from pathlib import Path
import tempfile
import unittest

from build_site import build_site, RESOURCES


class ResourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        self.urls.extend(value for key, value in attrs if key in ("src", "href"))


class BuildTests(unittest.TestCase):
    def test_versioned_artifact_and_data_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source"
            output = Path(directory) / "output"
            (source / "assets").mkdir(parents=True)
            (source / "data").mkdir()
            html = '<link rel="stylesheet" href="assets/styles.css">' + ''.join(
                f'<script defer src="{name}"></script>' for name in RESOURCES[1:])
            (source / "index.html").write_text(html)
            for name in RESOURCES:
                (source / name).write_text("/* asset */")
            (source / "data/videos.json").write_text('[{"sortWeight":0}]')
            (source / "data/private.mhtml").write_text("not public")
            (source / "serve.py").write_text("not public")
            version = build_site(source, output)
            self.assertEqual(version, build_site(source, output))
            parser = ResourceParser()
            parser.feed((output / "index.html").read_text())
            self.assertEqual(parser.urls, [f"{name}?v={version}" for name in RESOURCES])
            self.assertEqual((source / "index.html").read_text(), html)
            self.assertEqual((output / "data/videos.json").read_bytes(), (source / "data/videos.json").read_bytes())
            self.assertFalse((output / "data/private.mhtml").exists())
            self.assertFalse((output / "serve.py").exists())
            (source / "data/videos.json").write_text('[{"sortWeight":5}]')
            self.assertNotEqual(version, build_site(source, output))
            self.assertTrue((output / ".nojekyll").exists())

    def test_rejects_overwriting_source(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                build_site(directory, directory)
