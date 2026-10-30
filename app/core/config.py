from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    PROJECT_NAME: str = "Student Management API"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:password@localhost:5432/student_mgmt"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7

    # Invite / Reset
    INVITE_EXPIRE_HOURS: int = 48
    RESET_EXPIRE_MINUTES: int = 30

    # Cookie
    COOKIE_SECURE: bool = False  # set True in production (HTTPS)

    # Email
    EMAIL_BACKEND: str = "console"  # "console" prints to terminal in dev

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Feature flags
    ENABLE_ONLINE_APPLICATIONS: bool = False

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Seed super admin (used by seed script only)
    SEED_SUPER_ADMIN_EMAIL: str = "admin@school.local"
    SEED_SUPER_ADMIN_PASSWORD: str = "ChangeMe@1234"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

