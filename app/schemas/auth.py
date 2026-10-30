import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    requires_2fa: bool = False
    temp_token: str | None = None


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email, Student Code, or Employee Code")
    password: str = Field(..., min_length=1)


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=10)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=10)


class ChangePasswordRequest(BaseModel):
    old_password: str | None = None
    new_password: str = Field(..., min_length=10)


class RefreshTokenRequest(BaseModel):
    refresh_token: str | None = None


class MessageResponse(BaseModel):
    message: str


# 2FA schemas
class TwoFactorSetupResponse(BaseModel):
    secret: str
    otpauth_url: str


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    temp_token: str | None = None


class TwoFactorDisableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    password: str
