"""Shared planner execution flow for recommendation generation and persistence."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.agents.workflow import get_agent_workflow
from app.models.plan_run import PlanRun
from app.models.recommendation import Recommendation
from app.schemas.contracts import PlanRequest
from app.services.planner import extract_recipe_metadata, retrieve_recipe_candidate


def execute_plan_request(
    *,
    db: Session,
    request: PlanRequest,
    trigger: str,
) -> Recommendation:
    """Run the planner workflow and persist Recommendation + PlanRun."""

    run = PlanRun(
        user_id=request.user_id,
        status="PROCESSING",
        mode="pending",
        request_payload=request.model_dump(),
        trace_notes=[f"trigger:{trigger}"],
    )
    db.add(run)
    db.flush()

    workflow = get_agent_workflow()

    try:
        recommendation, trace_notes, mode = workflow.recommend(request)
        selected_recipe = retrieve_recipe_candidate(request.inventory, constraints=request.constraints)
        recipe_metadata = extract_recipe_metadata(selected_recipe)

        rec = Recommendation(
            user_id=request.user_id,
            recipe_title=recommendation.recipe_title,
            steps=recommendation.steps,
            nutrition_summary=recommendation.nutrition_summary.model_dump(),
            substitutions=recommendation.substitutions,
            spoilage_alerts=recommendation.spoilage_alerts,
            grocery_gap=[item.model_dump() for item in recommendation.grocery_gap],
            recipe_metadata=recipe_metadata,
        )
        db.add(rec)
        db.flush()

        run.status = "COMPLETED"
        run.mode = mode
        run.recommendation_id = rec.id
        run.response_payload = recommendation.model_dump()
        run.trace_notes = run.trace_notes + trace_notes
        run.completed_at = datetime.now(timezone.utc)
        db.add(run)

        db.commit()
        db.refresh(rec)
        return rec
    except Exception:
        run.status = "FAILED"
        run.mode = "error"
        run.trace_notes = run.trace_notes + ["planner_exception"]
        run.completed_at = datetime.now(timezone.utc)
        db.add(run)
        db.commit()
        raise
