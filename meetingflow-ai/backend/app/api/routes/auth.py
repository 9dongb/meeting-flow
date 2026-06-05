import secrets

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.security import create_access_token
from app.crud.google_accounts import get_google_account_by_sub, upsert_google_account
from app.crud.users import authenticate_user, create_user, get_user_by_email, update_user_name, user_name_from_email
from app.schemas.auth import AuthResponse, LoginRequest
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.google_oauth import LOGIN_SCOPES, GoogleOAuthError, build_google_auth_url, exchange_code_for_tokens, fetch_google_userinfo


router = APIRouter(prefix="/auth", tags=["auth"])
GOOGLE_LOGIN_STATE_COOKIE = "meetingflow_google_login_state"


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


def _redirect_frontend(path: str = "/dashboard") -> RedirectResponse:
    settings = get_settings()
    return RedirectResponse(f"{settings.frontend_base_url}{path}", status_code=status.HTTP_302_FOUND)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: DbSession, response: Response) -> AuthResponse:
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = create_user(db, user_in)
    _set_auth_cookie(response, create_access_token(user.email))
    return AuthResponse(user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(login_in: LoginRequest, db: DbSession, response: Response) -> AuthResponse:
    user = authenticate_user(db, login_in.email, login_in.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    _set_auth_cookie(response, create_access_token(user.email))
    return AuthResponse(user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
def patch_me(user_in: UserUpdate, db: DbSession, current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(update_user_name(db, current_user, user_in.name))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    _clear_auth_cookie(response)


@router.get("/google/login")
def google_login() -> RedirectResponse:
    settings = get_settings()
    state = secrets.token_urlsafe(24)
    try:
        url = build_google_auth_url(
            state=state,
            redirect_uri=settings.google_login_redirect_uri,
            scopes=LOGIN_SCOPES,
        )
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=GOOGLE_LOGIN_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=600,
        path="/",
    )
    return response


@router.get("/google/callback")
def google_callback(
    request: Request,
    db: DbSession,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    settings = get_settings()
    expected_state = request.cookies.get(GOOGLE_LOGIN_STATE_COOKIE)
    if not expected_state or expected_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google OAuth state")

    try:
        tokens = exchange_code_for_tokens(code, settings.google_login_redirect_uri)
        userinfo = fetch_google_userinfo(tokens["access_token"])
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    email = str(userinfo.get("email", "")).lower()
    google_sub = str(userinfo.get("sub", ""))
    if not email or not google_sub:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account did not return email/sub")

    google_account = get_google_account_by_sub(db, google_sub)
    user = google_account.user if google_account else get_user_by_email(db, email)
    if not user:
        name = str(userinfo.get("name") or "").strip() or user_name_from_email(email)
        user = create_user(db, UserCreate(name=name, email=email, password=secrets.token_urlsafe(24)))
    upsert_google_account(
        db,
        user=user,
        google_sub=google_sub,
        email=email,
    )

    redirect = _redirect_frontend("/dashboard")
    _set_auth_cookie(redirect, create_access_token(user.email))
    redirect.delete_cookie(
        key=GOOGLE_LOGIN_STATE_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    return redirect
