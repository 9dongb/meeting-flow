from urllib.parse import urlencode

import httpx

from app.core.config import get_settings


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

LOGIN_SCOPES = ["openid", "email", "profile"]
CALENDAR_SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"]
CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events"


class GoogleOAuthError(Exception):
    pass


def build_google_auth_url(
    *,
    state: str,
    redirect_uri: str,
    scopes: list[str],
    prompt: str | None = None,
) -> str:
    settings = get_settings()
    if not settings.google_client_id:
        raise GoogleOAuthError("GOOGLE_CLIENT_ID is not configured.")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "state": state,
        "access_type": "offline",
        "include_granted_scopes": "true",
    }
    if prompt:
        params["prompt"] = prompt
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleOAuthError("Google OAuth client settings are not configured.")

    try:
        response = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise GoogleOAuthError(f"Google token exchange failed: {exc.response.text[:300]}") from exc
    except httpx.HTTPError as exc:
        raise GoogleOAuthError(f"Google token exchange failed: {exc}") from exc


def fetch_google_userinfo(access_token: str) -> dict:
    try:
        response = httpx.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise GoogleOAuthError(f"Google userinfo request failed: {exc.response.text[:300]}") from exc
    except httpx.HTTPError as exc:
        raise GoogleOAuthError(f"Google userinfo request failed: {exc}") from exc


def has_calendar_events_scope(scope_value: str | None) -> bool:
    if not scope_value:
        return False
    return CALENDAR_EVENTS_SCOPE in set(scope_value.split())
