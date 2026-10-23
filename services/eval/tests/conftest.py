import importlib
import os

import pytest
from cryptography.fernet import Fernet

# The settings singleton is created on import and requires an encryption key,
# so provide a throwaway key before importing it (no env setup needed for tests).
os.environ["LLM_EVAL_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from llm_eval.settings import Settings  # noqa: E402


@pytest.fixture(autouse=True)
def test_settings() -> None:
    """Set up test settings with a consistent encryption key."""
    # Generate a consistent key for testing
    test_key = Fernet.generate_key()
    os.environ["LLM_EVAL_ENCRYPTION_KEY"] = test_key.decode()

    # Reload the settings module so the SETTINGS singleton uses the new key
    import llm_eval.settings

    importlib.reload(llm_eval.settings)

    # Ensure the settings are reloaded with the new key
    Settings.model_validate({})


def pytest_configure() -> None:
    # Generate a consistent key for testing
    test_key = Fernet.generate_key()
    os.environ["LLM_EVAL_ENCRYPTION_KEY"] = test_key.decode()
    # Reload the settings module so the SETTINGS singleton uses the new key
    import llm_eval.settings

    importlib.reload(llm_eval.settings)
