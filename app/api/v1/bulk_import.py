from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_db, require_roles
from app.models.user import User, UserRole
from app.services.import_service import parse_and_validate_csv

router = APIRouter(prefix="/admin/users/bulk-import", tags=["Admin - Bulk Import"])


@router.post("", status_code=status.HTTP_200_OK)
async def bulk_import_users(
    request: Request,
    file: UploadFile = File(...),
    dry_run: bool = Query(True, description="When True, validates without creating accounts"),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Bulk import students and teachers via CSV file with dry-run support."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV file (.csv)",
        )

    content_bytes = await file.read()
    try:
        content_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must be UTF-8 encoded",
        )

    ip = get_client_ip(request)
    result = parse_and_validate_csv(
        db,
        content=content_text,
        dry_run=dry_run,
        actor_id=current_user.id,
        ip=ip,
    )
    return result
