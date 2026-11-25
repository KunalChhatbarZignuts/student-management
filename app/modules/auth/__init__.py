def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.auth.router import router as auth_router
        from app.modules.auth.users_router import router as users_router
        r = APIRouter()
        r.include_router(auth_router)
        r.include_router(users_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
