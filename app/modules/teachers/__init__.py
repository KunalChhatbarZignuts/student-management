def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.teachers.router import router as teachers_router
        from app.modules.teachers.admin_router import router as admin_teachers_router
        from app.modules.teachers.classes_router import router as teacher_classes_router
        from app.modules.teachers.sections_router import router as teacher_sections_router
        from app.modules.teachers.subjects_router import router as teacher_subjects_router
        from app.modules.teachers.admin_subjects_router import router as admin_teacher_subjects_router
        r = APIRouter()
        r.include_router(teachers_router)
        r.include_router(admin_teachers_router)
        r.include_router(teacher_classes_router)
        r.include_router(teacher_sections_router)
        r.include_router(teacher_subjects_router)
        r.include_router(admin_teacher_subjects_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
