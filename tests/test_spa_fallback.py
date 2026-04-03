import asyncio
from pathlib import Path
import shutil
from uuid import uuid4

import backend.server as server


def make_public_dir() -> tuple[Path, Path]:
    public_dir = Path(__file__).resolve().parent / f"_tmp_public_{uuid4().hex}"
    public_dir.mkdir()
    index_file = public_dir / "index.html"
    index_file.write_text("<html><body>AlgoViz SPA</body></html>", encoding="utf-8")
    return public_dir, index_file


def test_spa_routes_fall_back_to_index_html(monkeypatch):
    public_dir, index_file = make_public_dir()
    try:
        monkeypatch.setattr(server, "PUBLIC_DIR", public_dir)
        monkeypatch.setattr(server, "INDEX_FILE", index_file)

        response = asyncio.run(server.serve_frontend("sorting"))

        assert response.status_code == 200
        assert Path(response.path) == index_file
    finally:
        shutil.rmtree(public_dir, ignore_errors=True)


def test_built_assets_are_served_from_public_directory(monkeypatch):
    public_dir, index_file = make_public_dir()
    static_dir = public_dir / "static" / "js"
    static_dir.mkdir(parents=True)
    asset_file = static_dir / "main.js"
    asset_file.write_text("console.log('algoviz');", encoding="utf-8")

    try:
        monkeypatch.setattr(server, "PUBLIC_DIR", public_dir)
        monkeypatch.setattr(server, "INDEX_FILE", index_file)

        response = asyncio.run(server.serve_frontend("static/js/main.js"))

        assert response.status_code == 200
        assert Path(response.path) == asset_file
    finally:
        shutil.rmtree(public_dir, ignore_errors=True)
