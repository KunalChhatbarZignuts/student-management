def __getattr__(name: str):
    if name == "router":
        from fastapi import APIRouter
        from app.modules.attendance.admin_router import router as admin_attendance_router
        from app.modules.attendance.teacher_router import router as teacher_attendance_router
        from app.modules.attendance.absence_notifications_router import router as absence_notifications_router
        from app.modules.attendance.leaves_router import router as leaves_router
        r = APIRouter()
        r.include_router(admin_attendance_router)
        r.include_router(teacher_attendance_router)
        r.include_router(absence_notifications_router)
        r.include_router(leaves_router)
        return r
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
