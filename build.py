from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from uuid import uuid4


ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"
NODE_MODULES_DIR = FRONTEND_DIR / "node_modules"
PUBLIC_DIR = ROOT_DIR / "frontend_dist"
NPM_EXECUTABLE = "npm.cmd" if os.name == "nt" else "npm"


def run(command: list[str], cwd: Path, extra_env: dict[str, str] | None = None) -> None:
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    subprocess.run(command, cwd=cwd, env=env, check=True)


def sync_build_to_public(build_dir: Path) -> None:
    if PUBLIC_DIR.exists():
        shutil.rmtree(PUBLIC_DIR)
    shutil.copytree(build_dir, PUBLIC_DIR)


def main() -> None:
    if not NODE_MODULES_DIR.exists():
        run([NPM_EXECUTABLE, "ci"], cwd=FRONTEND_DIR)
    build_dir = FRONTEND_DIR / f"vercel-build-{uuid4().hex}"
    try:
        run(
            [NPM_EXECUTABLE, "run", "build"],
            cwd=FRONTEND_DIR,
            extra_env={"BUILD_PATH": build_dir.name, "CI": "false"},
        )
        sync_build_to_public(build_dir)
    finally:
        shutil.rmtree(build_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
