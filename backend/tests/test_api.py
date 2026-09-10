"""Integration and endpoint tests for FastAPI backend with mocked MongoDB."""

import pytest
from unittest.mock import MagicMock, patch
from starlette.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    # Mock MongoDB connection and LangGraph for API route testing
    mock_client = MagicMock()
    mock_db = MagicMock()
    mock_client.__getitem__.return_value = mock_db

    with patch("backend.db.connection.get_client", return_value=mock_client), \
         patch("backend.main.get_client", return_value=mock_client), \
         patch("backend.main.ensure_indexes", return_value=None), \
         patch("backend.main.MongoDBSaver", return_value=MagicMock()), \
         patch("backend.main.build_graph", return_value=MagicMock()), \
         patch("backend.main.start_scheduler", return_value=None), \
         patch("backend.main.stop_scheduler", return_value=None):

        from backend.main import app
        with TestClient(app) as test_client:
            test_client.app.state.db = mock_db
            yield test_client


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_quick_complete_invalid_oid(client):
    response = client.get("/api/action-items/invalid_id/quick-complete")
    assert response.status_code == 400


def test_action_item_ics_invalid_oid(client):
    response = client.get("/api/action-items/invalid_id/calendar.ics")
    assert response.status_code == 400
