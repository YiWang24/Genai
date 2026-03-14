"""Natural-language feedback parsing into planning constraints."""

from __future__ import annotations

import re

from app.schemas.contracts import ConstraintSet

_ALLERGEN_HINTS = ("peanut", "dairy", "shellfish", "soy", "gluten")
_DIET_HINTS = ("vegetarian", "vegan", "keto", "pescatarian", "dairy-free", "gluten-free")
_MAX_FLOOR_CALORIES = 250


def merge_constraints(base: ConstraintSet, override: ConstraintSet) -> ConstraintSet:
    """Merge only explicitly provided fields from override into base."""

    payload = base.model_dump()
    for field in override.model_fields_set:
        payload[field] = getattr(override, field)
    return ConstraintSet(**payload)


def _append_unique(items: list[str], value: str) -> None:
    value = value.strip().lower()
    if value and value not in items:
        items.append(value)


def derive_constraints_from_message(base: ConstraintSet, message: str | None) -> tuple[ConstraintSet, list[str]]:
    """Infer structured constraints from free-form feedback instructions."""

    if not message:
        return base, []

    text = message.lower()
    constraints = base.model_copy(deep=True)
    notes: list[str] = []

    calories_match = re.search(r"(?:under|below|max(?:imum)?|<=?)\s*(\d{2,4})\s*(?:k?cal|calories?)", text)
    if not calories_match:
        calories_match = re.search(r"(\d{2,4})\s*(?:k?cal|calories?)", text)
    if calories_match:
        constraints.calories_target = int(calories_match.group(1))
        notes.append(f"applied_calorie_target:{constraints.calories_target}")
    elif "lower calories" in text or "lower calorie" in text:
        current = constraints.calories_target or 600
        constraints.calories_target = max(_MAX_FLOOR_CALORIES, int(current * 0.85))
        notes.append(f"reduced_calorie_target:{constraints.calories_target}")

    time_match = re.search(r"(\d{1,3})\s*(?:minutes|minute|mins|min)\b", text)
    if time_match:
        constraints.max_cook_time_minutes = int(time_match.group(1))
        notes.append(f"applied_cook_time_limit:{constraints.max_cook_time_minutes}")

    protein_match = re.search(r"(?:protein).{0,12}(\d{1,3})\s*g", text)
    if protein_match:
        constraints.protein_g_target = int(protein_match.group(1))
        notes.append(f"applied_protein_target:{constraints.protein_g_target}")

    budget_match = re.search(r"(?:budget|under)\s*\$?\s*(\d{1,4})(?:\.\d{1,2})?", text)
    if budget_match and ("budget" in text or "$" in text):
        constraints.budget_limit = float(budget_match.group(1))
        notes.append(f"applied_budget_limit:{constraints.budget_limit}")

    dietary_restrictions = list(constraints.dietary_restrictions or [])
    for hint in _DIET_HINTS:
        if hint in text:
            _append_unique(dietary_restrictions, hint)
            notes.append(f"applied_diet_restriction:{hint}")
    constraints.dietary_restrictions = dietary_restrictions

    allergies = list(constraints.allergies or [])
    for allergen in _ALLERGEN_HINTS:
        patterns = [
            rf"\bno\s+{allergen}s?\b",
            rf"\bwithout\s+{allergen}s?\b",
            rf"\b{allergen}-free\b",
        ]
        if any(re.search(pattern, text) for pattern in patterns):
            _append_unique(allergies, allergen)
            notes.append(f"applied_allergy:{allergen}")
    constraints.allergies = allergies

    return constraints, notes
