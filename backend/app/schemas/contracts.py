"""Shared request and response contracts for MVP API endpoints."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProblemResponse(BaseModel):
    code: str
    message: str
    trace_id: str
    retryable: bool = False


class ConstraintSet(BaseModel):
    calories_target: int | None = None
    protein_g_target: int | None = None
    carbs_g_target: int | None = None
    fat_g_target: int | None = None
    dietary_restrictions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    budget_limit: float | None = None
    max_cook_time_minutes: int | None = None


class InventoryItem(BaseModel):
    ingredient: str
    quantity: str | None = None
    expires_in_days: int | None = None


class InventorySnapshot(BaseModel):
    user_id: str
    items: list[InventoryItem] = Field(default_factory=list)


class MealLog(BaseModel):
    user_id: str
    meal_name: str
    calories: int | None = None
    protein_g: int | None = None
    carbs_g: int | None = None
    fat_g: int | None = None


class PlanRequest(BaseModel):
    user_id: str
    constraints: ConstraintSet
    inventory: InventorySnapshot | None = None
    latest_meal_log: MealLog | None = None
    user_message: str | None = None


class NutritionSummary(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


class GroceryItem(BaseModel):
    ingredient: str
    reason: str


class RecommendationBundle(BaseModel):
    recommendation_id: str
    recipe_title: str
    steps: list[str] = Field(default_factory=list)
    nutrition_summary: NutritionSummary
    substitutions: list[str] = Field(default_factory=list)
    spoilage_alerts: list[str] = Field(default_factory=list)
    grocery_gap: list[GroceryItem] = Field(default_factory=list)


class FeedbackPatch(BaseModel):
    action: Literal["accept", "reject"]
    message: str | None = None


class AgentTrace(BaseModel):
    run_id: str
    stage: Literal["PERCEIVE", "REASON", "RETRIEVE", "ACT", "REFLECT"]
    notes: list[str] = Field(default_factory=list)


class JobEnvelope(BaseModel):
    job_id: str
    status: JobStatus
    result: dict[str, Any] | None = None


class IngredientDetection(BaseModel):
    ingredient: str
    quantity: str | None = None
    expires_in_days: int | None = None


class FridgeScanRequest(BaseModel):
    image_url: str
    detected_items: list[IngredientDetection] = Field(default_factory=list)


class MealScanRequest(BaseModel):
    image_url: str
    meal_name: str | None = None
    calories: int | None = None
    protein_g: int | None = None
    carbs_g: int | None = None
    fat_g: int | None = None


class ReceiptScanRequest(BaseModel):
    image_url: str
    items: list[IngredientDetection] = Field(default_factory=list)


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    event_id: int
    user_id: str
    message: str


class FeedbackResponse(BaseModel):
    event_id: int
    recommendation_id: str
    action: Literal["accept", "reject"]
    message: str | None = None
    replanned_recommendation_id: str | None = None
