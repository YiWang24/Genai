"""Reflection validators for recommendation safety and constraint compliance."""

from __future__ import annotations

from app.schemas.contracts import PlanRequest, RecommendationBundle

_ANIMAL_KEYWORDS = {
    "chicken",
    "beef",
    "pork",
    "lamb",
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "bacon",
    "meat",
}


def _contains_animal_terms(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in _ANIMAL_KEYWORDS)


def apply_reflection(bundle: RecommendationBundle, request: PlanRequest) -> tuple[RecommendationBundle, list[str]]:
    """Enforce hard constraints and return reflection notes."""

    notes: list[str] = []

    # Hard guard: remove allergen ingredients from grocery gap if known.
    allergies = {a.lower() for a in request.constraints.allergies}
    restrictions = {r.lower() for r in request.constraints.dietary_restrictions}
    vegetarian_like = bool({"vegetarian", "vegan"} & restrictions)
    if bundle.grocery_gap:
        filtered_gap = []
        for item in bundle.grocery_gap:
            ingredient = item.ingredient.lower()
            if ingredient in allergies:
                notes.append(f"Removed allergen ingredient from grocery gap: {ingredient}")
                continue
            if vegetarian_like and _contains_animal_terms(ingredient):
                notes.append(f"Removed non-{','.join(sorted({'vegetarian','vegan'} & restrictions))} ingredient: {ingredient}")
                continue
            filtered_gap.append(item)
        bundle.grocery_gap = filtered_gap

    calories_target = request.constraints.calories_target
    if calories_target is not None and bundle.nutrition_summary.calories > calories_target:
        notes.append("Calorie target exceeded; adjusted output with lower-calorie guidance")
        bundle.substitutions.append("Use a smaller portion or lower-calorie protein swap")
    protein_target = request.constraints.protein_g_target
    if protein_target is not None and bundle.nutrition_summary.protein_g < protein_target:
        notes.append("Protein target not met; added high-protein substitution guidance")
        bundle.substitutions.append("Add tofu, beans, or Greek yogurt to increase protein")

    carbs_target = request.constraints.carbs_g_target
    if carbs_target is not None and bundle.nutrition_summary.carbs_g > carbs_target:
        notes.append("Carb target exceeded; added lower-carb substitution guidance")
        bundle.substitutions.append("Replace part of starch with extra vegetables")

    fat_target = request.constraints.fat_g_target
    if fat_target is not None and bundle.nutrition_summary.fat_g > fat_target:
        notes.append("Fat target exceeded; added lower-fat cooking guidance")
        bundle.substitutions.append("Use less oil and choose leaner protein options")

    if vegetarian_like and _contains_animal_terms(bundle.recipe_title):
        notes.append("Recipe title conflicts with vegetarian/vegan restriction; added swap guidance")
        bundle.substitutions.append("Swap animal protein for tofu, lentils, or tempeh")

    expiring_items = []
    if request.inventory and request.inventory.items:
        expiring_items = [
            item.ingredient.lower()
            for item in request.inventory.items
            if item.expires_in_days is not None and item.expires_in_days <= 2
        ]
    if expiring_items:
        steps_text = " ".join(bundle.steps).lower()
        missing = [item for item in expiring_items if item not in steps_text and item not in bundle.recipe_title.lower()]
        if missing:
            notes.append("Spoilage-priority ingredient missing in plan; added explicit use-soon alert")
            bundle.spoilage_alerts.extend([f"Prioritize using {item} within 48h" for item in missing])

    # Deduplicate generated guidance.
    bundle.substitutions = list(dict.fromkeys(bundle.substitutions))
    bundle.spoilage_alerts = list(dict.fromkeys(bundle.spoilage_alerts))

    if not notes:
        notes.append("Reflection checks passed")

    return bundle, notes
