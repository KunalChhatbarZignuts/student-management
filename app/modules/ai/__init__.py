def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.ai.assistant.router import router as assistant_router
        from app.modules.ai.learning.router import router as learning_router
        r = APIRouter()
        r.include_router(assistant_router)
        r.include_router(learning_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
