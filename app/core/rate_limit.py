from fastapi import Request, Response
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse


def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Return consistent 429 response when rate limit is exceeded."""
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


# Application-wide Limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    headers_enabled=False,
)

