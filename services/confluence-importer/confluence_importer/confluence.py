"""Module for interacting with the Confluence API to retrieve content."""

from typing import Generator

from atlassian import Confluence
from dataclasses import dataclass

from confluence_importer.logger import logger
from confluence_importer.config import config

confluence_url = config.confluence_url

# The importer uses the REST API v1 (content with expansions, paginated by offset) of the Server/Data Center client.
# Since atlassian-python-api 5 the client is chosen by the URL and the Cloud client lacks these methods.
confluence_api = Confluence(url=confluence_url, token=config.confluence_token, cloud=False)  # type: ignore[no-untyped-call]


@dataclass
class ConfluencePage:
    """Data class representing a Confluence page with its content and metadata."""

    id: int
    last_updated: str
    url: str
    html_content: str
    title: str


def get_page(page_id: int) -> ConfluencePage:
    """Retrieves the content of a Confluence page by its ID.

    Args:
        page_id: The ID of the Confluence page to retrieve

    Returns:
        A ConfluencePage dataclass containing the page information and content as HTML
    """
    page = confluence_api.get_page_by_id(page_id, expand="body.storage,history.lastUpdated")

    return ConfluencePage(
        page_id,
        page.get("history").get("lastUpdated").get("when"),
        f"{confluence_url}{page.get('_links').get('webui')}",
        page.get("body").get("storage").get("value"),
        title=page.get("title"),
    )


def get_pages_for_space(space_key: str) -> Generator[ConfluencePage]:
    """Retrieves all pages from a specified Confluence space.

    Args:
        space_key: The key identifier of the Confluence space to retrieve pages from

    Yields:
        ConfluencePage dataclasses containing the page information and content as HTML, each page exactly once
    """
    # `get_all_pages_from_space_as_generator()` paginates internally: it requests batches of `limit` pages and stops
    # as soon as a batch contains fewer than `limit` pages. So `limit` must not exceed the page size the server
    # actually returns (the server caps it), otherwise crawling stops after the first batch. 100 is known to work.
    batch_size = 100
    logger.debug("Fetch Pages for Confluence Space", space_key=space_key, limit=batch_size)

    result = confluence_api.get_all_pages_from_space_as_generator(
        space_key,
        start=0,
        limit=batch_size,
        content_type="page",
        expand="body.storage,history.lastUpdated",
        status="current",
    )

    fetched = 0
    try:
        for r in result:
            fetched += 1
            yield ConfluencePage(
                r.get("id"),
                r.get("history").get("lastUpdated").get("when"),
                f"{confluence_url}{r.get('_links').get('webui')}",
                r.get("body").get("storage").get("value"),
                r.get("title"),
            )
    except Exception as e:
        logger.error(
            "Error fetching pages for Confluence Space. Abort further crawling of this space.",
            error=str(e),
            space_key=space_key,
            fetched=fetched,
        )
        return

    logger.info("All Pages for Confluence Space fetched", space_key=space_key, count=fetched)
