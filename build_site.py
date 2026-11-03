"""Prepare a static Pages artifact with content-versioned resource URLs."""

import argparse
import hashlib
from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent
RESOURCES = ("assets/styles.css", "assets/video-order.js", "assets/app.js")


def build_site(source, output):
    source, output = Path(source).resolve(), Path(output).resolve()
    if source == output or source.is_relative_to(output):
        raise ValueError("Build output must not contain the source directory")
    digest = hashlib.sha256()
    for name in ("index.html", *RESOURCES, "data/videos.json"):
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        digest.update((source / name).read_bytes())
        digest.update(b"\0")
    version = digest.hexdigest()[:16]
    output.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source / "assets", output / "assets", dirs_exist_ok=True)
    (output / "data").mkdir(exist_ok=True)
    shutil.copy2(source / "data/videos.json", output / "data/videos.json")
    html = (source / "index.html").read_text(encoding="utf-8")
    for name in RESOURCES:
        reference = f'"{name}"'
        if reference not in html:
            raise ValueError(f"Missing resource reference: {name}")
        html = html.replace(reference, f'"{name}?v={version}"')
    (output / "index.html").write_text(html, encoding="utf-8")
    (output / ".nojekyll").touch()
    return version


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "_site")
    args = parser.parse_args()
    print(f"Built release {build_site(ROOT, args.output)}")
