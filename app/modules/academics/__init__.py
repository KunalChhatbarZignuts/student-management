def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.academics.classes_router import router as admin_classes_router
        from app.modules.academics.grades_router import router as admin_grades_router
        from app.modules.academics.sections_router import router as admin_sections_router
        from app.modules.academics.enrollments_router import router as enrollments_router
        from app.modules.academics.timetables_router import router as timetables_router
        from app.modules.academics.substitutions_router import router as substitutions_router
        from app.modules.academics.calendar_router import router as calendar_router
        from app.modules.academics.rollover_router import router as rollover_router
        r = APIRouter()
        r.include_router(admin_classes_router)
        r.include_router(admin_grades_router)
        r.include_router(admin_sections_router)
        r.include_router(enrollments_router)
        r.include_router(timetables_router)
        r.include_router(substitutions_router)
        r.include_router(calendar_router)
        r.include_router(rollover_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
