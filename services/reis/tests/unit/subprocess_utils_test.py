import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

import pytest

from rei_s.services.formats import subprocess_utils, utils
from rei_s.types.source_file import SourceFile


def test_run() -> None:
    result = subprocess_utils.run(["sh", "-c", "echo out; echo err >&2; exit 3"], timeout=10)

    assert result.returncode == 3
    assert result.stdout == b"out\n"
    assert result.stderr == b"err\n"


def test_timeout_kills_the_whole_process_group() -> None:
    # The background `sleep` simulates a helper process like `soffice.bin`. It inherits the output pipes, so `run` can
    # only return before the `sleep` ends if the helper was killed together with the shell.
    started = time.monotonic()
    with pytest.raises(subprocess.TimeoutExpired):
        subprocess_utils.run(["sh", "-c", "sleep 60 & wait"], timeout=1)

    assert time.monotonic() - started < 30


def test_office_conversion_timeout_cleans_up(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(tempfile, "tempdir", str(tmp_path))
    monkeypatch.setattr(utils, "LIBREOFFICE_TIMEOUT_SECONDS", 0.01)
    path = tmp_path / "upload"
    shutil.copy("tests/data/birthdays.odt", path)

    with pytest.raises(subprocess.TimeoutExpired):
        utils.convert_office_to_pdf(SourceFile(path=path, file_name="birthdays.odt", mime_type=""))

    assert os.listdir(tmp_path) == ["upload"]
