import logging
import multiprocessing as mp
import pickle
import queue as queue_module
from typing import Any, Literal

from rei_s.logger_formatter import JsonFormatter
from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.types.source_file import SourceFile

Method = Literal["process_file", "convert_file_to_pdf"]

# how often the parent checks whether the child is still alive while waiting for the result
POLL_INTERVAL_SECONDS = 1.0


class SubprocessError(RuntimeError):
    pass


def init_subprocess_logger() -> None:
    """For initilizing the logging format in newly spawned processes"""
    logger = logging.getLogger("root")

    logger.setLevel("INFO")
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)


def _picklable_exception(e: Exception) -> Exception:
    try:
        pickle.loads(pickle.dumps(e))
    except Exception:
        return SubprocessError(repr(e))
    return e


def _run_in_child(
    method: Method, format_: AbstractFormatProvider, file: SourceFile, args: tuple[Any, ...], queue: mp.Queue
) -> None:
    had_preview_pdf = file.preview_pdf_cache is not None
    try:
        init_subprocess_logger()
        result = getattr(format_, method)(file, *args)
    except Exception as e:
        if not had_preview_pdf and file.preview_pdf_cache is not None:
            file.preview_pdf_cache.delete()
        queue.put((None, None, _picklable_exception(e)))
    else:
        # A pdf preview created as a by-product (e.g. office files) is handed to the parent, which owns the file.
        preview_pdf = file.preview_pdf_cache if not had_preview_pdf else None
        queue.put((result, preview_pdf, None))


def run_in_process(method: Method, format_: AbstractFormatProvider, file: SourceFile, *args: Any) -> Any:
    """Calls `format_.<method>(file, *args)` in a spawned process and returns its result.

    Raises if the child raises, or if it exits without a result (e.g. killed by the OOM killer).
    """
    ctx = mp.get_context("spawn")
    queue = ctx.Queue()
    process = ctx.Process(target=_run_in_child, args=(method, format_, file, args, queue))
    process.start()
    try:
        while True:
            try:
                result, preview_pdf, exception = queue.get(timeout=POLL_INTERVAL_SECONDS)
                break
            except queue_module.Empty:
                if process.is_alive():
                    continue
                # the child may have exited right after putting its result
                try:
                    result, preview_pdf, exception = queue.get(timeout=POLL_INTERVAL_SECONDS)
                    break
                except queue_module.Empty:
                    raise SubprocessError(
                        f"{method} of {file.id} exited with code {process.exitcode} without a result"
                    ) from None
    finally:
        process.join(timeout=10)
        if process.is_alive():  # pragma: no cover
            process.kill()
            process.join()
        queue.close()

    if exception is not None:
        raise exception

    if preview_pdf is not None:
        if file.preview_pdf_cache is None:
            file.preview_pdf_cache = preview_pdf
        elif preview_pdf.path != file.preview_pdf_cache.path:
            preview_pdf.delete()

    return result
