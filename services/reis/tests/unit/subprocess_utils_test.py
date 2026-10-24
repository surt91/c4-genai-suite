import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

import pytest

from rei_s.services.formats import subprocess_utils, utils
from rei_s.types.source_file import SourceFile


def is_running(pid: int) -> bool:
    try:
        with open(f"/proc/{pid}/stat") as f:
            # zombies are dead, they only wait to be reaped
            return f.read().rsplit(") ", 1)[1][0] not in {"Z", "X"}
    except (FileNotFoundError, ProcessLookupError):
        # the process can vanish between opening and reading its stat file
        return False


def test_run() -> None:
    result = subprocess_utils.run(["sh", "-c", "echo out; echo err >&2; exit 3"], timeout=10)

    assert result.returncode == 3
    assert result.stdout == b"out\n"
    assert result.stderr == b"err\n"


def test_timeout_kills_the_whole_process_group(tmp_path: Path) -> None:
    pid_file = tmp_path / "pid"

    with pytest.raises(subprocess.TimeoutExpired):
        # the background `sleep` simulates a helper process like `soffice.bin`
        subprocess_utils.run(
            ["sh", "-c", f"sleep 100 & echo $! > {pid_file}.tmp; mv {pid_file}.tmp {pid_file}; wait"], timeout=5
        )

    pid = int(pid_file.read_text())
    deadline = time.monotonic() + 10
    while is_running(pid) and time.monotonic() < deadline:
        time.sleep(0.05)
    assert not is_running(pid)


def test_office_conversion_timeout_cleans_up(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(tempfile, "tempdir", str(tmp_path))
    monkeypatch.setattr(utils, "LIBREOFFICE_TIMEOUT_SECONDS", 0.01)
    path = tmp_path / "upload"
    shutil.copy("tests/data/birthdays.odt", path)

    with pytest.raises(subprocess.TimeoutExpired):
        utils.convert_office_to_pdf(SourceFile(path=path, file_name="birthdays.odt", mime_type=""))

    assert os.listdir(tmp_path) == ["upload"]
