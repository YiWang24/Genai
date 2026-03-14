"""Tests for phase-4 feedback and replan loop."""

from fastapi.testclient import TestClient


def _sample_plan_request(user_id: str) -> dict:
    return {
        "user_id": user_id,
        "constraints": {
            "calories_target": 2100,
            "protein_g_target": 130,
            "dietary_restrictions": ["vegetarian"],
            "allergies": ["peanut"],
            "max_cook_time_minutes": 20,
        },
        "inventory": {
            "user_id": user_id,
            "items": [
                {"ingredient": "tofu", "quantity": "400g", "expires_in_days": 2}
            ],
        },
    }


def test_feedback_requires_auth(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/feedback/recommendations/rec-1",
        json={"action": "accept", "message": "looks good"},
    )
    assert response.status_code == 401


def test_feedback_accept_persists_event(client: TestClient) -> None:
    user_id = "feedback-1"
    headers = {"Authorization": "Bearer fake-token", "X-Test-User-Id": user_id}

    created = client.post("/api/v1/planner/recommendations", json=_sample_plan_request(user_id), headers=headers)
    recommendation_id = created.json()["recommendation_id"]

    patched = client.patch(
        f"/api/v1/feedback/recommendations/{recommendation_id}",
        json={"action": "accept", "message": "looks good"},
        headers=headers,
    )

    assert patched.status_code == 200
    body = patched.json()
    assert body["action"] == "accept"
    assert body["recommendation_id"] == recommendation_id
    assert body["replanned_recommendation_id"] is None


def test_feedback_reject_creates_replanned_recommendation(client: TestClient) -> None:
    user_id = "feedback-2"
    headers = {"Authorization": "Bearer fake-token", "X-Test-User-Id": user_id}

    created = client.post("/api/v1/planner/recommendations", json=_sample_plan_request(user_id), headers=headers)
    original_id = created.json()["recommendation_id"]

    patched = client.patch(
        f"/api/v1/feedback/recommendations/{original_id}",
        json={"action": "reject", "message": "lower calories please"},
        headers=headers,
    )

    assert patched.status_code == 200
    body = patched.json()
    assert body["action"] == "reject"
    assert body["recommendation_id"] == original_id
    assert body["replanned_recommendation_id"]

    latest = client.get(f"/api/v1/planner/recommendations/latest/{user_id}", headers=headers)
    assert latest.status_code == 200
    latest_body = latest.json()
    assert latest_body["recommendation_id"] == body["replanned_recommendation_id"]
    assert "Replan" in latest_body["recipe_title"]
