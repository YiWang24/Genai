"""Google ADK workflow orchestrator for meal recommendation planning."""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from uuid import uuid4

from app.agents.reflection import apply_reflection
from app.agents.schemas import AdkRecommendationOutput
from app.agents.tools import (
    analyze_fridge_vision,
    analyze_meal_vision,
    calculate_meal_macros,
    generate_grocery_gap_tool,
    parse_receipt_items,
    retrieve_recipe_candidates,
)
from app.core.config import Settings, get_settings
from app.schemas.contracts import (
    GroceryItem,
    NutritionSummary,
    PlanRequest,
    RecommendationBundle,
)
from app.services.planner import calculate_nutrition, generate_grocery_gap, retrieve_recipe_candidate

try:
    from google.adk.agents import LlmAgent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    ADK_AVAILABLE = True
except Exception:  # pragma: no cover - environment dependent
    ADK_AVAILABLE = False


class AdkPlannerWorkflow:
    """Execution wrapper for ADK-based orchestration with safe fallback."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.app_name = "eco-health-adk"
        self._enabled = bool(settings.adk_enabled and settings.gemini_api_key and ADK_AVAILABLE)
        self._runner: Runner | None = None
        self._session_service: InMemorySessionService | None = None

        if not self._enabled:
            return

        # ADK relies on GOOGLE_API_KEY for model provider auth.
        os.environ.setdefault("GOOGLE_API_KEY", settings.gemini_api_key)

        self._session_service = InMemorySessionService()
        self._runner = Runner(
            app_name=self.app_name,
            agent=self._build_agent(),
            session_service=self._session_service,
        )

    def _build_agent(self) -> LlmAgent:
        instruction = (
            "You are Eco-Health Agentic Dietitian orchestrator. "
            "Use tools to reason over inventory, nutrition, and grocery gap. "
            "Return strict JSON matching schema with fields: "
            "recipe_title, steps, substitutions, spoilage_alerts, grocery_gap, nutrition_summary, confidence_note."
        )
        return LlmAgent(
            name="eco_health_orchestrator",
            model=self.settings.adk_model,
            instruction=instruction,
            tools=[
                analyze_fridge_vision,
                analyze_meal_vision,
                parse_receipt_items,
                retrieve_recipe_candidates,
                calculate_meal_macros,
                generate_grocery_gap_tool,
            ],
            output_schema=AdkRecommendationOutput,
        )

    def recommend(self, request: PlanRequest) -> tuple[RecommendationBundle, list[str], str]:
        """Generate recommendation using ADK flow; fallback safely on failures."""

        trace: list[str] = []
        if not self._enabled or not self._runner or not self._session_service:
            trace.append("adk_disabled_or_unavailable")
            bundle = self._fallback_bundle(request)
            bundle, reflection_notes = apply_reflection(bundle, request)
            return bundle, trace + reflection_notes, "fallback"

        try:
            session_id = str(uuid4())
            self._session_service.create_session_sync(
                app_name=self.app_name,
                user_id=request.user_id,
                session_id=session_id,
            )

            prompt = self._build_prompt(request)
            user_message = types.UserContent(parts=[types.Part.from_text(text=prompt)])

            final_text: str | None = None
            for event in self._runner.run(user_id=request.user_id, session_id=session_id, new_message=user_message):
                if event.author:
                    trace.append(f"event_author:{event.author}")
                event_text = self._event_text(event)
                if event_text:
                    final_text = event_text

            if not final_text:
                raise ValueError("No final ADK response text produced")

            parsed = self._parse_adk_output(final_text)
            bundle = RecommendationBundle(
                recommendation_id=str(uuid4()),
                recipe_title=parsed.recipe_title,
                steps=parsed.steps,
                substitutions=parsed.substitutions,
                spoilage_alerts=parsed.spoilage_alerts,
                grocery_gap=[GroceryItem(**item.model_dump()) for item in parsed.grocery_gap],
                nutrition_summary=NutritionSummary(**parsed.nutrition_summary.model_dump()),
            )
            bundle, reflection_notes = apply_reflection(bundle, request)
            trace.extend(reflection_notes)
            return bundle, trace, "adk"
        except Exception as exc:  # pragma: no cover - network/provider dependent
            trace.append(f"adk_error:{exc.__class__.__name__}")
            bundle = self._fallback_bundle(request)
            bundle, reflection_notes = apply_reflection(bundle, request)
            return bundle, trace + reflection_notes, "fallback"

    @staticmethod
    def _event_text(event) -> str | None:
        content = getattr(event, "content", None)
        if not content or not getattr(content, "parts", None):
            return None
        texts = [part.text for part in content.parts if getattr(part, "text", None)]
        if not texts:
            return None
        return "\n".join(texts)

    @staticmethod
    def _parse_adk_output(text: str) -> AdkRecommendationOutput:
        text = text.strip()
        try:
            return AdkRecommendationOutput.model_validate_json(text)
        except Exception:
            pass

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("Unable to parse ADK JSON output")
        payload = json.loads(match.group(0))
        return AdkRecommendationOutput.model_validate(payload)

    @staticmethod
    def _build_prompt(request: PlanRequest) -> str:
        return (
            "Generate one meal recommendation for this user context. "
            "Prefer expiring ingredients, obey dietary restrictions, and keep grocery gap minimal.\n"
            f"Payload: {request.model_dump_json()}"
        )

    @staticmethod
    def _fallback_bundle(request: PlanRequest) -> RecommendationBundle:
        recipe = retrieve_recipe_candidate(request.inventory, constraints=request.constraints)
        nutrition = calculate_nutrition(recipe, request.inventory)
        grocery_gap = generate_grocery_gap(recipe, request.inventory)
        spoilage_alerts = []
        if request.inventory:
            spoilage_alerts = [
                f"Use {item.ingredient} soon"
                for item in request.inventory.items
                if item.expires_in_days is not None and item.expires_in_days <= 2
            ]

        return RecommendationBundle(
            recommendation_id=str(uuid4()),
            recipe_title=recipe["recipe_title"],
            steps=recipe["steps"],
            nutrition_summary=nutrition,
            substitutions=recipe.get("substitutions") or [],
            spoilage_alerts=spoilage_alerts,
            grocery_gap=[GroceryItem(**item) for item in grocery_gap],
        )


@lru_cache(maxsize=1)
def get_agent_workflow() -> AdkPlannerWorkflow:
    """Return cached orchestrator workflow instance."""

    return AdkPlannerWorkflow(get_settings())
