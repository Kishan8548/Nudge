"""Integration and endpoint tests for FastAPI backend."""

import pytest
from starlette.testclient import TestClient
from backend.main import app


@pytest.fixture(scope="module")
def client():
    # Use TestClient with lifespan context
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_quick_complete_invalid_oid(client):
    response = client.get("/api/action-items/invalid_id/quick-complete")
    assert response.status_code in (400, 404)


def test_action_item_ics_invalid_oid(client):
    response = client.get("/api/action-items/invalid_id/calendar.ics")
    assert response.status_code in (400, 404)
