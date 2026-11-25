def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.fees.router import router as fees_main_router
        from app.modules.fees.pos_router import router as fees_pos_router
        r = APIRouter()
        r.include_router(fees_main_router)
        r.include_router(fees_pos_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
