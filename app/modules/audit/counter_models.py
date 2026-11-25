from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IdCounter(Base):
    """Counter table for concurrency-safe sequential ID generation with row locking."""
    __tablename__ = "id_counters"

    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    current_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:
        return f"<IdCounter {self.name}={self.current_value}>"
