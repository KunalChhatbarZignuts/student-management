"""Common query utilities and pagination helpers for optimized database access."""

from typing import Any, Generic, Sequence, TypeVar
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate_query(
    db: Session,
    query: Select,
    page: int = 1,
    page_size: int = 50,
) -> tuple[Sequence[Any], int, int]:
    """
    Executes an optimized two-stage paginated query:
    1. Count query over subquery (avoids loading models into memory).
    2. Offset/limit query returning results slice.
    Returns: (items, total_count, total_pages)
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 50
    if page_size > 500:
        page_size = 500

    # Count without loading relationship payloads
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    offset = (page - 1) * page_size
    items = db.execute(query.offset(offset).limit(page_size)).scalars().all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return items, total, total_pages
