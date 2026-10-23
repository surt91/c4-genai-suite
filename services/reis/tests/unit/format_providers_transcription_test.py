import subprocess
import tempfile
from pathlib import Path

import pytest
from faker import Faker
from langchain_core.documents import Document
from pytest_mock import MockerFixture

from rei_s.config import Config
from rei_s.services.formats.pdf_provider import PdfProvider
from rei_s.services.formats.utils import ProcessingError
from rei_s.services.formats.video_transcription_provider import VideoTranscriptionProvider
from rei_s.services.formats.voice_transcription_provider import VoiceTranscriptionProvider
from rei_s.types.source_file import SourceFile
from tests.conftest import get_test_config

# Tests for our speech-to-text glue code (ffmpeg splitting/extraction + chunking).
# The Azure OpenAI Whisper call itself is mocked, so no credentials are needed.
# Requires `ffmpeg` on the host (it is a runtime dependency of REI-S as well).

AUDIO_DURATION_S = 16
AUDIO_FORMATS = ["mp3", "m4a", "ogg", "flac", "wav"]


@pytest.fixture(scope="session")
def audio_files(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Path]:
    """Generate small test audio files on the fly instead of committing (LFS) binaries."""
    directory = tmp_path_factory.mktemp("audio")
    files = {}
    for fmt in AUDIO_FORMATS:
        path = directory / f"birthdays.{fmt}"
        cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-f", "lavfi"]
        cmd += ["-i", f"sine=frequency=440:sample_rate=44100:duration={AUDIO_DURATION_S}", "-ac", "2"]
        if fmt == "ogg":
            cmd += ["-c:a", "libopus"]
        cmd.append(str(path))
        try:
            subprocess.run(cmd, check=True, capture_output=True)
        except FileNotFoundError:
            pytest.fail("ffmpeg is required for the transcription tests, please install it")
        files[fmt] = path
    return files


# Inputs that need reencoding (wav/opus are not passed through), with sample rates and channel
# counts for which a fixed vorbis bitrate of 128k is invalid.
REENCODE_INPUTS = {
    "mono_16khz.wav": ["-ar", "16000", "-ac", "1"],
    "mono_8khz.wav": ["-ar", "8000", "-ac", "1"],
    "mono_16khz.ogg": ["-ar", "16000", "-ac", "1", "-c:a", "libopus", "-b:a", "24k"],
    "surround_96khz.wav": ["-ar", "96000", "-ac", "6"],
}


@pytest.fixture(scope="session")
def reencode_audio_files(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Path]:
    directory = tmp_path_factory.mktemp("audio_reencode")
    files = {}
    for name, args in REENCODE_INPUTS.items():
        path = directory / name
        cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-f", "lavfi"]
        cmd += ["-i", f"sine=frequency=440:sample_rate=44100:duration={AUDIO_DURATION_S}", *args, str(path)]
        subprocess.run(cmd, check=True, capture_output=True)
        files[name] = path
    return files


def get_mock_config() -> Config:
    return get_test_config(
        dict(
            stt_type="azure-openai-whisper",
            stt_azure_openai_whisper_endpoint="example.com",
            stt_azure_openai_whisper_deployment_name="whisper",
            stt_azure_openai_whisper_api_version="version",
            stt_azure_openai_whisper_api_key="secret",
        )
    )


@pytest.fixture
def mocked_whisper_answer(mocker: MockerFixture, faker: Faker) -> str:
    content = faker.text()
    docs = [Document(content)]
    mocker.patch(
        "rei_s.services.formats.voice_transcription_provider.AzureOpenAIWhisperParser.parse", return_value=docs
    )
    return content


@pytest.mark.parametrize("fmt", AUDIO_FORMATS)
def test_audio_transcription_provider_mocked(
    mocked_whisper_answer: str, audio_files: dict[str, Path], fmt: str
) -> None:
    filename = f"birthdays.{fmt}"
    source_file = SourceFile(path=str(audio_files[fmt]), mime_type="", file_name=filename)

    # the audio file is 16 s long. With a segment duration of 7 s we split it in 3 parts
    provider = VoiceTranscriptionProvider(
        config=get_mock_config(), chunk_size=200, chunk_overlap=0, default_segment_duration=7
    )

    assert provider.supports(source_file)
    docs = provider.process_file(source_file)

    assert len(docs) >= 2
    assert mocked_whisper_answer in docs[0].page_content
    assert mocked_whisper_answer in docs[1].page_content


@pytest.mark.parametrize("name", REENCODE_INPUTS)
def test_audio_transcription_provider_reencode_sample_rates(
    mocked_whisper_answer: str, reencode_audio_files: dict[str, Path], name: str
) -> None:
    source_file = SourceFile(path=str(reencode_audio_files[name]), mime_type="", file_name=name)

    provider = VoiceTranscriptionProvider(
        config=get_mock_config(), chunk_size=200, chunk_overlap=0, default_segment_duration=7
    )

    assert provider.supports(source_file)
    docs = provider.process_file(source_file)

    assert len(docs) >= 2
    assert mocked_whisper_answer in docs[0].page_content


@pytest.mark.parametrize("name", ["mono_16khz.wav", "mono_8khz.wav"])
def test_video_transcription_provider_reencode_sample_rates(
    mocked_whisper_answer: str, reencode_audio_files: dict[str, Path], name: str
) -> None:
    source_file = SourceFile(path=str(reencode_audio_files[name]), mime_type="video/mp4", file_name="birthdays.mp4")

    provider = VideoTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    docs = provider.process_file(source_file)

    assert len(docs) > 0
    assert mocked_whisper_answer in docs[0].page_content


def test_audio_transcription_provider_broken_file(mocked_whisper_answer: str) -> None:
    # we will give something which is not a media file to ffmpeg and wait the error
    source_file = SourceFile(path="tests/data/birthdays.pdf", mime_type="audio/mp3", file_name="birthdays.mp3")

    provider = VoiceTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)

    with pytest.raises(ProcessingError) as e:
        provider.process_file(source_file)
    assert e.value.message == "Error handling audio file for voice transcription"
    assert 400 <= e.value.status < 500


# We use an mp3/wav as a mock to extract the audio from instead of a real mp4.
# FFmpeg handles the wrong file extension just fine and we can test all of our logic.
@pytest.mark.parametrize("fmt", ["mp3", "wav"])
def test_video_transcription_provider_mocked(
    mocked_whisper_answer: str, audio_files: dict[str, Path], fmt: str
) -> None:
    source_file = SourceFile(path=str(audio_files[fmt]), mime_type="video/mp4", file_name="birthdays.mp4")

    provider = VideoTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)
    docs = provider.process_file(source_file)

    assert len(docs) > 0
    assert mocked_whisper_answer in docs[0].page_content


def test_video_transcription_provider_broken_file(mocked_whisper_answer: str) -> None:
    # we will give something which is not a media file to ffmpeg and wait the error
    source_file = SourceFile(path="tests/data/birthdays.pdf", mime_type="video/mp4", file_name="birthdays.mp4")

    provider = VideoTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)

    with pytest.raises(ProcessingError) as e:
        provider.process_file(source_file)
    # the ffmpeg output (with server paths) is only logged
    assert e.value.message == "Error extracting audio track from video file for voice transcription with ffmpeg"
    assert 400 <= e.value.status < 500


@pytest.fixture
def temp_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    directory = tmp_path / "temp"
    directory.mkdir()
    monkeypatch.setattr(tempfile, "tempdir", str(directory))
    return directory


def generate_audio(path: Path, duration: float) -> SourceFile:
    cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=frequency=440:duration={duration}"]
    subprocess.run([*cmd, str(path)], check=True, capture_output=True)
    return SourceFile(path=str(path), mime_type="", file_name=path.name)


@pytest.mark.parametrize(
    "provider_class,file_name", [(VoiceTranscriptionProvider, "a.mp3"), (VideoTranscriptionProvider, "a.mp4")]
)
def test_transcription_is_shared_by_chunks_and_preview(
    mocker: MockerFixture,
    audio_files: dict[str, Path],
    provider_class: type[VoiceTranscriptionProvider],
    file_name: str,
) -> None:
    parse = mocker.patch("rei_s.services.formats.voice_transcription_provider.AzureOpenAIWhisperParser.parse")
    parse.return_value = [Document("Dagobert Duck counts his coins")]
    source_file = SourceFile(path=str(audio_files["mp3"]), mime_type="", file_name=file_name)
    provider = provider_class(config=get_mock_config(), default_segment_duration=7)

    chunks = provider.process_file(source_file)
    pdf = provider.convert_file_to_pdf(source_file)

    # one Whisper call per segment, not two
    assert parse.call_count == 3
    assert "Dagobert" in chunks[0].page_content
    assert "Dagobert" in "".join(doc.page_content for doc in PdfProvider().process_file(pdf))
    pdf.delete()


def test_audio_segments_are_deleted_on_failure(
    mocker: MockerFixture, audio_files: dict[str, Path], temp_dir: Path
) -> None:
    parse = mocker.patch("rei_s.services.formats.voice_transcription_provider.AzureOpenAIWhisperParser.parse")
    parse.side_effect = [[Document("first")], RuntimeError("whisper unavailable")]
    source_file = SourceFile(path=str(audio_files["mp3"]), mime_type="", file_name="birthdays.mp3")
    provider = VoiceTranscriptionProvider(config=get_mock_config(), default_segment_duration=7)

    with pytest.raises(RuntimeError, match="whisper unavailable"):
        provider.process_file(source_file)

    assert list(temp_dir.iterdir()) == []


def test_extracted_audio_is_deleted_on_failure(
    mocker: MockerFixture, audio_files: dict[str, Path], temp_dir: Path
) -> None:
    parse = mocker.patch("rei_s.services.formats.voice_transcription_provider.AzureOpenAIWhisperParser.parse")
    parse.side_effect = RuntimeError("whisper unavailable")
    source_file = SourceFile(path=str(audio_files["mp3"]), mime_type="", file_name="birthdays.mp4")
    provider = VideoTranscriptionProvider(config=get_mock_config())

    with pytest.raises(RuntimeError, match="whisper unavailable"):
        provider.process_file(source_file)

    assert list(temp_dir.iterdir()) == []


def test_audio_shorter_than_a_second(mocked_whisper_answer: str, tmp_path: Path) -> None:
    source_file = generate_audio(tmp_path / "short.mp3", 0.5)

    docs = VoiceTranscriptionProvider(config=get_mock_config()).process_file(source_file)

    assert mocked_whisper_answer in docs[0].page_content


def test_last_partial_segment_is_transcribed(mocker: MockerFixture, tmp_path: Path) -> None:
    parse = mocker.patch("rei_s.services.formats.voice_transcription_provider.AzureOpenAIWhisperParser.parse")
    parse.return_value = [Document("text")]
    source_file = generate_audio(tmp_path / "audio.mp3", 10.5)

    provider = VoiceTranscriptionProvider(config=get_mock_config(), default_segment_duration=5)
    docs = provider.process_file(source_file)

    # 0-5 s, 5-10 s and 10-10.5 s
    assert parse.call_count == 3
    assert docs[-1].metadata["segment_begin_seconds"] == 10
