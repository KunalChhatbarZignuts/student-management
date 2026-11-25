def __getattr__(name: str):
    if name == "router":
        from app.modules.diary.router import router
        return router
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
