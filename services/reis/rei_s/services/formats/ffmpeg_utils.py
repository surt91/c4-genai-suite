"""Minimal wrappers around the `ffmpeg` and `ffprobe` command line tools."""

import json
import subprocess
from pathlib import Path
from typing import Any


class FfmpegError(Exception):
    def __init__(self, cmd: str, stdout: bytes, stderr: bytes) -> None:
        super().__init__(f"{cmd} error (see stderr output for detail)")
        self.stdout = stdout
        self.stderr = stderr


def _run(args: list[str]) -> bytes:
    result = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True)
    if result.returncode != 0:
        raise FfmpegError(args[0], result.stdout, result.stderr)
    return result.stdout


def probe(path: str | Path) -> dict[str, Any]:
    """Returns the format and stream information of a media file as reported by ffprobe."""
    out = _run(["ffprobe", "-show_format", "-show_streams", "-of", "json", "-loglevel", "warning", str(path)])
    return json.loads(out)


def convert(
    input_path: str | Path, output_path: str | Path, output_args: list[str], input_args: list[str] | None = None
) -> None:
    """Runs `ffmpeg [input_args] -i input_path [output_args] -y output_path`."""
    _run(["ffmpeg", *(input_args or []), "-i", str(input_path), *output_args, "-y", str(output_path)])
