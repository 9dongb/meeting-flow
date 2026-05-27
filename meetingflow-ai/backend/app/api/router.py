from fastapi import APIRouter

from app.api.routes import action_items, auth, integrations, meetings


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(meetings.router)
api_router.include_router(action_items.router)
api_router.include_router(integrations.router)
