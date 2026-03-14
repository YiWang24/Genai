"""Feedback endpoints for accept/reject and replan triggers."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.feedback_event import FeedbackEvent
from app.models.recommendation import Recommendation
from app.schemas.auth import AuthContext
from app.schemas.contracts import ConstraintSet, FeedbackPatch, FeedbackResponse, PlanRequest
from app.services.constraint_parser import derive_constraints_from_message
from app.services.planner_context import build_effective_plan_request
from app.services.planner_execution import execute_plan_request

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.patch("/recommendations/{recommendation_id}", response_model=FeedbackResponse)
async def patch_recommendation_feedback(
    recommendation_id: str,
    payload: FeedbackPatch,
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    rec = db.get(Recommendation, recommendation_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    if rec.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden recommendation scope")

    event = FeedbackEvent(
        user_id=current_user.user_id,
        recommendation_id=recommendation_id,
        action=payload.action,
        message=payload.message,
    )
    db.add(event)
    db.flush()

    replanned_id: str | None = None
    if payload.action == "reject":
        base_request = build_effective_plan_request(
            db,
            PlanRequest(
                user_id=current_user.user_id,
                constraints=ConstraintSet(),
                user_message=payload.message,
            ),
            current_user.user_id,
        )
        constraints, parser_notes = derive_constraints_from_message(base_request.constraints, payload.message)
        effective_request = PlanRequest(
            user_id=current_user.user_id,
            constraints=constraints,
            inventory=base_request.inventory,
            latest_meal_log=base_request.latest_meal_log,
            user_message=payload.message or base_request.user_message,
        )
        replanned = execute_plan_request(
            db=db,
            request=effective_request,
            trigger=f"feedback_reject:{recommendation_id}",
        )
        replanned_id = replanned.id
        if parser_notes:
            event.message = (payload.message or "") + f" | parser_notes={';'.join(parser_notes)}"
            db.add(event)

    db.commit()

    return FeedbackResponse(
        event_id=event.id,
        recommendation_id=recommendation_id,
        action=payload.action,
        message=payload.message,
        replanned_recommendation_id=replanned_id,
    )
