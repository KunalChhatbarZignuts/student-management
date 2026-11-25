def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.students.router import router as students_router
        from app.modules.students.admin_router import router as admin_students_router
        from app.modules.students.admissions_router import router as admissions_router
        from app.modules.students.parents_router import router as parents_router
        r = APIRouter()
        r.include_router(students_router)
        r.include_router(admin_students_router)
        r.include_router(admissions_router)
        r.include_router(parents_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
