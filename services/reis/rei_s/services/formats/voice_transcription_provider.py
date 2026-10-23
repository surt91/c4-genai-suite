from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import openai

from rei_s import logger
from rei_s.config import Config
from rei_s.services.formats import ffmpeg_utils
from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import (
    ProcessingError,
    validate_chunk_overlap,
    validate_chunk_size,
    generate_pdf_from_md_file,
)
from rei_s.types.source_file import SourceFile, temp_file


@dataclass
class MediaMetadata:
    audio_codec: str | None
    duration: float


class AzureOpenAIWhisperParser:
    """Transcribes audio files with a Whisper deployment on Azure OpenAI."""

    def __init__(
        self,
        *,
        api_key: str,
        azure_endpoint: str,
        api_version: str,
        deployment_name: str,
        max_retries: int = 3,
    ) -> None:
        self.deployment_name = deployment_name
        self.client = openai.AzureOpenAI(
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            api_version=api_version,
            max_retries=max_retries,
        )

    def parse(self, path: str | Path) -> list[Document]:
        with open(path, "rb") as file_obj:
            transcript = self.client.audio.transcriptions.create(model=self.deployment_name, file=file_obj)
        return [Document(page_content=transcript.text, metadata={"source": str(path)})]


class VoiceTranscriptionProvider(AbstractFormatProvider):
    name = "audio"

    file_name_extensions = [
        ".mp3",
        ".m4a",
        ".ogg",
        ".oga",
        ".ogx",
        ".flac",
        ".wav",
    ]

    # audio codecs supported by whisper other audio codecs will be reencoded
    supported_audio_codecs = {
        "aac",
        "mp3",
        "vorbis",
        "flac",
    }
    audio_codecs_to_file_extension = {
        "aac": "m4a",
        "mp3": "mp3",
        "vorbis": "ogg",
        "flac": "flac",
    }
    audio_codecs_to_mime_type = {
        "aac": "audio/mp4",
        "mp3": "audio/mp3",
        "vorbis": "audio/ogg",
        "flac": "audio/flac",
    }

    # Output options for reencoding to vorbis. A fixed bitrate (e.g. 128k) is rejected by libvorbis for many
    # sample rate / channel combinations (e.g. 16 kHz mono), so we use quality-based VBR instead. Downmixing to
    # mono is sufficient for speech recognition and keeps the segments small.
    reencode_output_args: list[str] = ["-acodec", "libvorbis", "-q:a", "4", "-ac", "1"]

    parser: AzureOpenAIWhisperParser | None

    def __init__(
        self,
        config: Config | None = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        default_segment_duration: int = 300,
        **_kwargs: Any,
    ) -> None:
        super().__init__()
        self.default_chunk_size = chunk_size
        self.default_chunk_overlap = chunk_overlap
        self.default_segment_duration = default_segment_duration

        if config and config.stt_type == "azure-openai-whisper":
            # this is ensured by the config validation, the following lines are there to help the ty typechecker
            if config.stt_azure_openai_whisper_api_key is None:
                raise ValueError("The env variable `STT_AZURE_OPENAI_WHISPER_API_KEY` is missing.")
            if config.stt_azure_openai_whisper_deployment_name is None:
                raise ValueError("The env variable `STT_AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME` is missing.")
            if config.stt_azure_openai_whisper_endpoint is None:
                raise ValueError("The env variable `STT_AZURE_OPENAI_WHISPER_ENDPOINT` is missing.")
            if config.stt_azure_openai_whisper_api_version is None:
                raise ValueError("The env variable `STT_AZURE_OPENAI_WHISPER_API_VERSION` is missing.")

            self.parser = AzureOpenAIWhisperParser(
                api_key=config.stt_azure_openai_whisper_api_key.get_secret_value(),
                azure_endpoint=config.stt_azure_openai_whisper_endpoint,
                api_version=config.stt_azure_openai_whisper_api_version,
                deployment_name=config.stt_azure_openai_whisper_deployment_name,
            )
        else:
            self.parser = None

    def splitter(
        self, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> RecursiveCharacterTextSplitter:
        chunk_size = validate_chunk_size(chunk_size, self.default_chunk_size)
        chunk_overlap = validate_chunk_overlap(chunk_overlap, self.default_chunk_overlap)
        return RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    @property
    def enabled(self) -> bool:
        return self.parser is not None

    @property
    def may_start_separate_process_for_chunking(self) -> bool:
        return False

    @staticmethod
    def build_ffmpeg_error_message(e: ffmpeg_utils.FfmpegError) -> str:
        stderr = e.stderr.decode(errors="replace")
        return f"Error handling audio file for voice transcription\n\nffmpeg stderr:\n{stderr}"

    def probe_audio_codec(self, input_video_file: str | Path) -> MediaMetadata:
        try:
            metadata = ffmpeg_utils.probe(input_video_file)
        except ffmpeg_utils.FfmpegError as e:
            message = self.build_ffmpeg_error_message(e)
            logger.error(message)
            raise ProcessingError(message, 400) from e

        audio_codec = None
        for stream in metadata["streams"]:
            if stream["codec_type"] == "audio":
                audio_codec = stream["codec_name"]
                break

        duration = float(metadata["format"]["duration"])

        return MediaMetadata(audio_codec, duration)

    def split_into_compatible_format(
        self,
        input_path: str | Path,
        segment_duration_seconds: int | None = None,
        force_reencode: bool = False,
    ) -> tuple[list[SourceFile], list[int | float], str]:
        metadata = self.probe_audio_codec(input_path)
        audio_codec = metadata.audio_codec
        duration = metadata.duration

        if segment_duration_seconds is None:
            segment_duration_seconds = self.default_segment_duration

        if audio_codec in self.supported_audio_codecs and not force_reencode:
            logger.info(f"segment audio of length {duration} s")
            output_args = ["-c", "copy"]
        else:
            logger.info(f"segment and reencode audio of length {duration} s")
            output_args = self.reencode_output_args
            audio_codec = "vorbis"

        segments_files: list[SourceFile] = []
        segment_timestamps: list[int | float] = list(range(0, int(duration), segment_duration_seconds))
        for n, start_time in enumerate(segment_timestamps):
            logger.info(f"segment {n + 1} / {len(segment_timestamps)}")

            segment_file = SourceFile.new_temporary_file(extension=self.audio_codecs_to_file_extension[audio_codec])
            try:
                ffmpeg_utils.convert(
                    input_path,
                    segment_file.path,
                    output_args,
                    input_args=["-ss", str(start_time), "-t", str(segment_duration_seconds)],
                )
            except ffmpeg_utils.FfmpegError as e:  # pragma: no cover
                message = self.build_ffmpeg_error_message(e)
                logger.error(message)
                raise ProcessingError(message, 400) from e

            segments_files.append(segment_file)

        segment_timestamps.append(duration)

        # check that no segment is larger than 25 MB. This could happen for very high bitrates.
        # In that case we reencode with a lower bitrate (unless we already did)
        if not force_reencode and any(x.size >= 25 * 1000 * 1000 for x in segments_files):
            # cleanup first
            for i in segments_files:
                i.delete()
            # split with reencode
            return self.split_into_compatible_format(input_path, segment_duration_seconds, force_reencode=True)

        return segments_files, segment_timestamps, audio_codec

    def parse_file(self, file: SourceFile) -> list[Document]:
        if self.parser is None:
            raise ValueError(f"calling disabled format provider: `{self.__class__.name}`")

        # Azure detects the format depending on the extension, so we need to preserve that.
        # If the file is larger than 25 MB, split it into multiple files and combine the output
        segments, segment_timestamps, _audio_codec = self.split_into_compatible_format(file.path)

        results = []
        for n, segment in enumerate(segments):
            logger.info(f"process {n + 1} / {len(segments)}")
            try:
                docs = self.parser.parse(segment.path)
            except openai.APIStatusError as e:  # pragma: no cover
                if e.status_code == 413:
                    raise ProcessingError("File too large. The limit is 25 MiB.", e.status_code) from e
                else:
                    raise
            finally:
                segment.delete()

            for doc in docs:
                doc.metadata["segment_begin_seconds"] = segment_timestamps[n]
                doc.metadata["segment_end_seconds"] = segment_timestamps[n + 1]
                doc.metadata["total_segments"] = len(segments)
                doc.metadata["total_duration"] = segment_timestamps[-1]

            results.extend(docs)

        return results

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        results = self.parse_file(file)

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(results)
        return chunks

    @property
    def previewable(self) -> bool:
        # a plaintext audio transcription is not a sensible pdf preview
        return False

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        docs = self.parse_file(file)

        plain = "\n".join([doc.page_content for doc in docs])

        with temp_file(plain.encode()) as plain_file:
            return generate_pdf_from_md_file(plain_file, "plain")
