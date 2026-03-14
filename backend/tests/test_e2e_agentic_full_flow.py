"""Real end-to-end agentic flow test with Gemini image generation.

Run explicitly:
  RUN_REAL_E2E_AGENTIC=1 GEMINI_API_KEY=... pytest -q tests/test_e2e_agentic_full_flow.py -s
Optional:
  NANO_BANANA_MODEL=gemini-2.5-flash-image
"""

from __future__ import annotations

import base64
import os
import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services import gemini_vision

try:
    from google import genai
except Exception:  # pragma: no cover - environment dependent
    genai = None


def _poll_job(client: TestClient, job_id: str, headers: dict[str, str]) -> dict[str, Any]:
    for _ in range(60):
        response = client.get(f"/api/v1/inputs/jobs/{job_id}", headers=headers)
        assert response.status_code == 200
        body = response.json()
        if body["status"] == "COMPLETED":
            return body
        if body["status"] == "FAILED":
            pytest.fail(f"Input job failed: {body}")
        time.sleep(0.25)
    pytest.fail("Timed out waiting for input job completion")


def _extract_image_bytes(response: Any) -> tuple[bytes, str] | None:
    # Preferred convenience accessor from SDK response object.
    parts = getattr(response, "parts", None)
    if not parts and getattr(response, "candidates", None):
        candidate_parts = getattr(response.candidates[0].content, "parts", None)
        if candidate_parts:
            parts = candidate_parts

    for part in parts or []:
        inline_data = getattr(part, "inline_data", None)
        if not inline_data:
            continue
        data = getattr(inline_data, "data", None)
        if not data:
            continue
        if isinstance(data, str):
            data = base64.b64decode(data)
        mime_type = getattr(inline_data, "mime_type", None) or "image/png"
        return data, mime_type
    return None


def _mime_to_suffix(mime_type: str) -> str:
    mime = mime_type.lower()
    if "jpeg" in mime or "jpg" in mime:
        return ".jpg"
    if "webp" in mime:
        return ".webp"
    return ".png"


def _generate_nano_banana_image(
    *,
    prompt: str,
    output_stem: str,
    output_dir: Path,
    api_key: str,
    model: str,
) -> Path:
    if genai is None:
        pytest.skip("google-genai is not available in current environment")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(model=model, contents=prompt)
    extracted = _extract_image_bytes(response)
    if not extracted:
        pytest.skip(f"No image payload was returned by model '{model}'")

    image_bytes, mime_type = extracted
    target = output_dir / f"{output_stem}{_mime_to_suffix(mime_type)}"
    target.write_bytes(image_bytes)
    return target


@pytest.mark.e2e
def test_agentic_full_flow_with_nano_banana_images(client: TestClient, tmp_path: Path) -> None:
    if os.getenv("RUN_REAL_E2E_AGENTIC") != "1":
        pytest.skip("Set RUN_REAL_E2E_AGENTIC=1 to run real E2E flow")

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        pytest.skip("GEMINI_API_KEY is required for real E2E flow")

    # Re-enable runtime Gemini usage for this explicit E2E test.
    os.environ["GEMINI_API_KEY"] = api_key
    get_settings.cache_clear()
    gemini_vision._get_client.cache_clear()

    image_model = os.getenv("NANO_BANANA_MODEL", "gemini-2.5-flash-image").strip()
    user_id = f"e2e-agentic-{int(time.time())}"
    headers = {"Authorization": "Bearer fake-token", "X-Test-User-Id": user_id}

    # 1) "Sign up": Cognito callback + authenticated identity bootstrap.
    callback = client.get("/api/v1/auth/cognito/callback?code=e2e-code&state=e2e-state")
    assert callback.status_code == 200
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user_id"] == user_id

    # 2) Profile + goals.
    profile_payload = {
        "age": 28,
        "height_cm": 172,
        "weight_kg": 68,
        "activity_level": "moderate",
        "dietary_preferences": ["high-protein"],
        "allergies": ["peanut"],
        "cook_time_preference_minutes": 20,
    }
    profile_resp = client.put(f"/api/v1/profiles/{user_id}", json=profile_payload, headers=headers)
    assert profile_resp.status_code == 200

    goals_payload = {
        "calories_target": 1900,
        "protein_g_target": 120,
        "carbs_g_target": 180,
        "fat_g_target": 65,
        "dietary_restrictions": ["vegetarian"],
        "allergies": ["peanut"],
        "budget_limit": 25,
        "max_cook_time_minutes": 20,
    }
    goals_resp = client.put(f"/api/v1/goals/{user_id}", json=goals_payload, headers=headers)
    assert goals_resp.status_code == 200

    # 3) Generate and upload receipt image -> agent reply.
    receipt_image = _generate_nano_banana_image(
        prompt=(
            "Create a realistic grocery receipt photo on white paper. "
            "Include items: tofu, spinach, tomato, onion, greek yogurt with prices."
        ),
        output_stem="receipt",
        output_dir=tmp_path,
        api_key=api_key,
        model=image_model,
    )
    receipt_submit = client.post(
        "/api/v1/inputs/receipt-scan",
        json={"image_url": str(receipt_image)},
        headers=headers,
    )
    assert receipt_submit.status_code == 202
    _poll_job(client, receipt_submit.json()["job_id"], headers)
    rec_after_receipt = client.post(
        "/api/v1/planner/recommendations",
        json={"user_id": user_id, "constraints": {}},
        headers=headers,
    )
    assert rec_after_receipt.status_code == 200

    # 4) Generate and upload fridge image -> agent reply.
    fridge_image = _generate_nano_banana_image(
        prompt=(
            "Create a realistic open fridge photo. Show spinach, tofu, tomato, yogurt, and eggs clearly."
        ),
        output_stem="fridge",
        output_dir=tmp_path,
        api_key=api_key,
        model=image_model,
    )
    fridge_submit = client.post(
        "/api/v1/inputs/fridge-scan",
        json={"image_url": str(fridge_image)},
        headers=headers,
    )
    assert fridge_submit.status_code == 202
    _poll_job(client, fridge_submit.json()["job_id"], headers)
    rec_after_fridge = client.post(
        "/api/v1/planner/recommendations",
        json={"user_id": user_id, "constraints": {}},
        headers=headers,
    )
    assert rec_after_fridge.status_code == 200

    # 5) Generate and upload lunch image -> agent reply.
    meal_image = _generate_nano_banana_image(
        prompt=(
            "Create a lunch photo of a tofu-spinach bowl with brown rice on a plate, natural lighting."
        ),
        output_stem="meal",
        output_dir=tmp_path,
        api_key=api_key,
        model=image_model,
    )
    meal_submit = client.post(
        "/api/v1/inputs/meal-scan",
        json={"image_url": str(meal_image)},
        headers=headers,
    )
    assert meal_submit.status_code == 202
    _poll_job(client, meal_submit.json()["job_id"], headers)
    rec_after_meal = client.post(
        "/api/v1/planner/recommendations",
        json={"user_id": user_id, "constraints": {}},
        headers=headers,
    )
    assert rec_after_meal.status_code == 200

    # 6) Send chat message -> agent reply + replan.
    chat_submit = client.post(
        "/api/v1/inputs/chat-message",
        json={"message": "Make it vegetarian, under 450 calories, and 15 minutes"},
        headers=headers,
    )
    assert chat_submit.status_code == 200
    rec_after_chat = client.post(
        "/api/v1/planner/recommendations",
        json={"user_id": user_id, "constraints": {}},
        headers=headers,
    )
    assert rec_after_chat.status_code == 200
    rec_id = rec_after_chat.json()["recommendation_id"]

    feedback = client.patch(
        f"/api/v1/feedback/recommendations/{rec_id}",
        json={"action": "reject", "message": "Lower calories and keep no peanut"},
        headers=headers,
    )
    assert feedback.status_code == 200
    assert feedback.json()["replanned_recommendation_id"]

    latest = client.get(f"/api/v1/planner/recommendations/latest/{user_id}", headers=headers)
    assert latest.status_code == 200
    final_bundle = latest.json()
    assert final_bundle["recipe_title"]
    assert final_bundle["nutrition_summary"]["calories"] >= 1

    run = client.get(f"/api/v1/planner/runs/latest/{user_id}", headers=headers)
    assert run.status_code == 200
    assert run.json()["status"] == "COMPLETED"
