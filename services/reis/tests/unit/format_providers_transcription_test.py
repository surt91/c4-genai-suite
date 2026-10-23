import subprocess
from pathlib import Path

import pytest
from faker import Faker
from langchain_core.documents import Document
from pytest_mock import MockerFixture

from rei_s.config import Config
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
    mocker.patch("langchain_community.document_loaders.parsers.audio.AzureOpenAIWhisperParser.parse", return_value=docs)
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


def test_audio_transcription_provider_broken_file(mocked_whisper_answer: str) -> None:
    # we will give something which is not a media file to ffmpeg and wait the error
    source_file = SourceFile(path="tests/data/birthdays.pdf", mime_type="audio/mp3", file_name="birthdays.mp3")

    provider = VoiceTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)

    with pytest.raises(ProcessingError) as e:
        provider.process_file(source_file)
    assert e.value.message.startswith("Error handling audio file for voice transcription")
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
    assert e.value.message.startswith(
        "Error extracting audio track from video file for voice transcription with ffmpeg"
    )
    assert 400 <= e.value.status < 500
