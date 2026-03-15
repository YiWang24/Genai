"""Authentication endpoints for Cognito integration."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import Settings, get_settings
from app.core.security import get_current_user
from app.schemas.auth import (
    AuthContext,
    CognitoConfirmRequest,
    CognitoLoginRequest,
    CognitoRefreshRequest,
    CognitoRegisterRequest,
    CognitoRegisterResponse,
    CognitoResendCodeRequest,
    CognitoTokenResponse,
    OtpRequestSchema,
    OtpVerifyRequest,
)
from app.services.cognito_auth import (
    cognito_confirm_sign_up,
    cognito_login,
    cognito_refresh,
    cognito_request_email_otp,
    cognito_resend_code,
    cognito_sign_up,
    cognito_verify_email_otp,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/cognito/callback")
async def cognito_signup_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> dict:
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cognito callback error: {error}")
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")

    # Hackathon-safe callback: frontend can exchange code server-side in next step.
    return {
        "status": "callback_received",
        "authorization_code": code,
        "state": state,
        "next_step": "Exchange code for tokens via Cognito token endpoint",
    }


@router.post("/register", response_model=CognitoRegisterResponse)
async def register_with_email(
    payload: CognitoRegisterRequest,
    settings: Settings = Depends(get_settings),
) -> CognitoRegisterResponse:
    data = cognito_sign_up(payload.email, payload.password, settings)
    details = data.get("CodeDeliveryDetails") or {}
    return CognitoRegisterResponse(
        email=payload.email,
        user_sub=data.get("UserSub"),
        user_confirmed=bool(data.get("UserConfirmed", False)),
        code_delivery_medium=details.get("DeliveryMedium"),
        code_destination=details.get("Destination"),
    )


@router.post("/confirm-email")
async def confirm_email(
    payload: CognitoConfirmRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    cognito_confirm_sign_up(payload.email, payload.code, settings)
    return {"status": "email_confirmed"}


@router.post("/resend-code")
async def resend_email_code(
    payload: CognitoResendCodeRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, str | None]:
    data = cognito_resend_code(payload.email, settings)
    details = data.get("CodeDeliveryDetails") or {}
    return {
        "status": "code_resent",
        "delivery_medium": details.get("DeliveryMedium"),
        "destination": details.get("Destination"),
    }


@router.post("/login", response_model=CognitoTokenResponse)
async def login_with_email(
    payload: CognitoLoginRequest,
    settings: Settings = Depends(get_settings),
) -> CognitoTokenResponse:
    data = cognito_login(payload.email, payload.password, settings)
    auth = data.get("AuthenticationResult") or {}
    return CognitoTokenResponse(
        id_token=auth.get("IdToken"),
        access_token=auth.get("AccessToken"),
        refresh_token=auth.get("RefreshToken"),
        token_type=auth.get("TokenType"),
        expires_in=auth.get("ExpiresIn"),
    )


@router.post("/refresh", response_model=CognitoTokenResponse)
async def refresh_tokens(
    payload: CognitoRefreshRequest,
    settings: Settings = Depends(get_settings),
) -> CognitoTokenResponse:
    data = cognito_refresh(payload.refresh_token, settings, payload.email)
    auth = data.get("AuthenticationResult") or {}
    return CognitoTokenResponse(
        id_token=auth.get("IdToken"),
        access_token=auth.get("AccessToken"),
        refresh_token=payload.refresh_token,
        token_type=auth.get("TokenType"),
        expires_in=auth.get("ExpiresIn"),
    )


@router.post("/request-code")
async def request_email_code(
    payload: OtpRequestSchema,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Send an OTP to the email. Auto-registers new users silently."""
    data = cognito_request_email_otp(payload.email, settings)
    return {"session": data["session"], "challenge_name": data.get("challenge_name")}


@router.post("/verify-code", response_model=CognitoTokenResponse)
async def verify_email_code(
    payload: OtpVerifyRequest,
    settings: Settings = Depends(get_settings),
) -> CognitoTokenResponse:
    """Verify the OTP and return auth tokens."""
    data = cognito_verify_email_otp(payload.email, payload.code, payload.session, settings)
    auth = data.get("AuthenticationResult") or {}
    return CognitoTokenResponse(
        id_token=auth.get("IdToken"),
        access_token=auth.get("AccessToken"),
        refresh_token=auth.get("RefreshToken"),
        token_type=auth.get("TokenType"),
        expires_in=auth.get("ExpiresIn"),
    )


@router.get("/me")
async def me(current_user: AuthContext = Depends(get_current_user)) -> AuthContext:
    return current_user
