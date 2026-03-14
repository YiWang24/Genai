"""Tests for ADK workflow integration and reflection fallback behavior."""

from app.agents.reflection import apply_reflection
from app.agents.workflow import get_agent_workflow
from app.schemas.contracts import (
    ConstraintSet,
    GroceryItem,
    InventoryItem,
    InventorySnapshot,
    NutritionSummary,
    PlanRequest,
    RecommendationBundle,
)


def _sample_request(user_id: str = "adk-user-1") -> PlanRequest:
    return PlanRequest(
        user_id=user_id,
        constraints=ConstraintSet(calories_target=500, allergies=["peanut"]),
        inventory=InventorySnapshot(
            user_id=user_id,
            items=[
                InventoryItem(ingredient="spinach", quantity="1 bunch", expires_in_days=1),
                InventoryItem(ingredient="tofu", quantity="400g", expires_in_days=2),
            ],
        ),
        user_message="Use expiring ingredients",
    )


def test_adk_workflow_falls_back_when_disabled() -> None:
    workflow = get_agent_workflow()
    bundle, trace_notes, mode = workflow.recommend(_sample_request())

    assert mode == "fallback"
    assert bundle.recipe_title
    assert bundle.steps
    assert len(trace_notes) >= 1


def test_reflection_removes_allergen_from_grocery_gap() -> None:
    request = _sample_request()
    request.constraints.dietary_restrictions = ["vegetarian"]
    bundle = RecommendationBundle(
        recommendation_id="rec-1",
        recipe_title="Chicken Sample",
        steps=["step 1"],
        nutrition_summary=NutritionSummary(calories=650, protein_g=25, carbs_g=40, fat_g=22),
        substitutions=[],
        spoilage_alerts=[],
        grocery_gap=[
            GroceryItem(ingredient="peanut", reason="required by selected recipe"),
            GroceryItem(ingredient="chicken breast", reason="required by selected recipe"),
            GroceryItem(ingredient="soy sauce", reason="required by selected recipe"),
        ],
    )

    reflected, notes = apply_reflection(bundle, request)

    assert all(item.ingredient != "peanut" for item in reflected.grocery_gap)
    assert all("chicken" not in item.ingredient for item in reflected.grocery_gap)
    assert any("allergen" in note.lower() for note in notes)
    assert any("calorie" in note.lower() for note in notes)
    assert any("vegetarian" in note.lower() or "vegan" in note.lower() for note in notes)
    assert reflected.spoilage_alerts
