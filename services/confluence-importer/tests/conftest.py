"""Provide deterministic dummy configuration, so the tests need neither a `.env` file nor real credentials.

This runs before the test modules import `confluence_importer.config` (which validates the config on import).
"""

import os

_TEST_ENV = {
    "CONFLUENCE_SPACE_KEYS_TO_IMPORT": '["my-space-1","my-space-2"]',
    "CONFLUENCE_PAGE_IDS_TO_IMPORT": "[112133614,287977195,896411614]",
    "CONFLUENCE_TOKEN": "01234567890",
    "CONFLUENCE_URL": "https://confluence.example.com",
    "GAIBLE_BASE_URL": "http://localhost:3333",
    "GAIBLE_BUCKET_ID": "42",
    "GAIBLE_TOKEN": "01234567890",
}

os.environ.update(_TEST_ENV)
