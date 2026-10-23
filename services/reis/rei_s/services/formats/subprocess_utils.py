import os
import signal
import subprocess
from typing import Mapping


def run(args: list[str], timeout: float, env: Mapping[str, str] | None = None) -> subprocess.CompletedProcess[bytes]:
    """Runs a command and captures its output, killing it (and everything it started) after `timeout` seconds.

    Tools like LibreOffice start helper processes (`soffice` -> `soffice.bin`), which survive if only the direct
    child is killed. So the command runs in its own session and the whole process group is killed.
    """
    with subprocess.Popen(
        args,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        start_new_session=True,
    ) as process:
        try:
            stdout, stderr = process.communicate(timeout=timeout)
        except BaseException:
            # timeout, but also e.g. KeyboardInterrupt
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:  # pragma: no cover
                pass
            process.communicate()
            raise
    return subprocess.CompletedProcess(args, process.returncode, stdout, stderr)
