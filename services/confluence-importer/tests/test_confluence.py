"""Tests for the Confluence API interaction functionality."""

from typing import Any

from pytest_mock import MockerFixture

from confluence_importer.confluence import get_page, get_pages_for_space, ConfluencePage, confluence_api, confluence_url


class TestConfluence:
    """Tests for the Confluence module functionality."""

    def test_get_page(self, mocker: MockerFixture) -> None:
        """Test that get_page correctly retrieves and parses a Confluence page.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        page_id = 123456
        mock_page_data = {
            "body": {"storage": {"value": "<h1>Test Page</h1>"}},
            "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
            "_links": {"webui": "/rest/api/content/123456"},
            "title": "Test Page",
        }

        mock_get_page_by_id = mocker.patch(
            "confluence_importer.confluence.confluence_api.get_page_by_id",
            return_value=mock_page_data,
        )

        # act
        result = get_page(page_id)

        # assert
        mock_get_page_by_id.assert_called_once_with(page_id, expand="body.storage,history.lastUpdated")
        assert isinstance(result, ConfluencePage)
        assert result.id == page_id
        assert result.last_updated == "2025-07-29T13:56:00.000Z"
        assert result.url == f"{confluence_url}/rest/api/content/123456"
        assert result.html_content == "<h1>Test Page</h1>"
        assert result.title == "Test Page"

    def test_get_pages_for_space(self, mocker: MockerFixture) -> None:
        """Test that get_pages_for_space correctly retrieves and parses pages from a Confluence space.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        space_key = "TEST"
        mock_pages = [
            {
                "id": 123456,
                "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
                "_links": {"webui": "/rest/api/content/123456"},
                "body": {"storage": {"value": "<h1>Test Page 1</h1>"}},
                "title": "Test Page 1",
            },
            {
                "id": 789012,
                "history": {"lastUpdated": {"when": "2025-07-30T10:15:00.000Z"}},
                "_links": {"webui": "/rest/api/content/789012"},
                "body": {"storage": {"value": "<h1>Test Page 2</h1>"}},
                "title": "Test Page 2",
            },
        ]

        mock_generator = mocker.patch(
            "confluence_importer.confluence.confluence_api.get_all_pages_from_space_as_generator",
            return_value=mock_pages,
        )

        mocker.patch("confluence_importer.confluence.logger.debug")
        mocker.patch("confluence_importer.confluence.logger.info")

        # act
        results = list(get_pages_for_space(space_key))

        # assert
        mock_generator.assert_called_once_with(
            space_key,
            start=0,
            limit=100,
            content_type="page",
            expand="body.storage,history.lastUpdated",
            status="current",
        )

        assert len(results) == 2

        assert isinstance(results[0], ConfluencePage)
        assert results[0].id == 123456
        assert results[0].last_updated == "2025-07-29T13:56:00.000Z"
        assert results[0].url == f"{confluence_url}/rest/api/content/123456"
        assert results[0].html_content == "<h1>Test Page 1</h1>"
        assert results[0].title == "Test Page 1"

        assert isinstance(results[1], ConfluencePage)
        assert results[1].id == 789012
        assert results[1].last_updated == "2025-07-30T10:15:00.000Z"
        assert results[1].url == f"{confluence_url}/rest/api/content/789012"
        assert results[1].html_content == "<h1>Test Page 2</h1>"
        assert results[1].title == "Test Page 2"

    def test_get_pages_for_space_pagination(self, mocker: MockerFixture) -> None:
        """Test that every page of a space spanning several API result pages is yielded exactly once.

        The REST endpoint is mocked, so the pagination of the atlassian client is exercised as well.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        space_key = "TEST"
        total_pages = 250
        all_pages = [
            {
                "id": i,
                "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
                "_links": {"webui": f"/rest/api/content/{i}"},
                "body": {"storage": {"value": f"<h1>Page {i}</h1>"}},
                "title": f"Page {i}",
            }
            for i in range(total_pages)
        ]

        def fake_get(path: str, params: dict[str, Any] | None = None, **kwargs: Any) -> dict[str, Any]:
            assert path == "rest/api/content"
            assert params is not None
            assert params["spaceKey"] == space_key
            start = params.get("start", 0)
            limit = min(params.get("limit", 25), 100)  # the server caps the page size
            results = all_pages[start : start + limit]
            return {"results": results, "start": start, "limit": limit, "size": len(results)}

        # `Confluence` delegates to the Server client, which sends the requests via its `get` method.
        mock_get = mocker.patch.object(confluence_api._impl, "get", side_effect=fake_get)

        mocker.patch("confluence_importer.confluence.logger.debug")
        mocker.patch("confluence_importer.confluence.logger.info")

        # act
        results = list(get_pages_for_space(space_key))

        # assert
        assert [page.id for page in results] == list(range(total_pages))
        assert [call.kwargs["params"].get("start", 0) for call in mock_get.call_args_list] == [0, 100, 200]
