#!/usr/bin/env python3
"""API Probe Script — calls real backend endpoints and generates probe_report.json.

Tokens, hashes, and passwords are redacted with "<redacted>" while preserving shapes.
"""

import json
import sys
import time
from pathlib import Path
from typing import Any, Dict

import httpx
import pyotp

BASE_URL = "http://localhost:8000/api/v1"
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
ENV_PROBE_PATH = ROOT_DIR / ".env.probe"
REPORT_PATH = ROOT_DIR / "probe_report.json"
MAIN_PY = ROOT_DIR / "app" / "main.py"

# Load .env.probe
creds: Dict[str, str] = {}
if ENV_PROBE_PATH.exists():
    for line in ENV_PROBE_PATH.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            creds[k.strip()] = v.strip()


def reset_limiter():
    """Touch app/main.py so uvicorn reloads and in-memory rate-limiter resets, then wait for port."""
    MAIN_PY.touch()
    time.sleep(2.5)
    for _ in range(30):
        try:
            with httpx.Client(timeout=2.0) as temp_c:
                r = temp_c.get("http://localhost:8000/api/v1/auth/me")
                if r.status_code in (401, 405):
                    time.sleep(0.5)
                    return
        except Exception:
            pass
        time.sleep(0.5)
    time.sleep(0.5)


def safe_request(client_or_method, method: str, url: str, **kwargs):
    """Execute request with retries in case uvicorn was in middle of reloading."""
    for attempt in range(4):
        try:
            if method.lower() == "get":
                return client_or_method.get(url, **kwargs)
            elif method.lower() == "post":
                return client_or_method.post(url, **kwargs)
            elif method.lower() == "put":
                return client_or_method.put(url, **kwargs)
            elif method.lower() == "patch":
                return client_or_method.patch(url, **kwargs)
            elif method.lower() == "delete":
                return client_or_method.delete(url, **kwargs)
        except (httpx.TransportError, ConnectionResetError):
            if attempt == 3:
                raise
            time.sleep(1.0)



def redact_data(obj: Any) -> Any:
    if isinstance(obj, dict):
        redacted = {}
        for k, v in obj.items():
            if any(term in k.lower() for term in ["token", "secret", "password", "hash", "otpauth_url"]):
                redacted[k] = "<redacted>"
            else:
                redacted[k] = redact_data(v)
        return redacted
    elif isinstance(obj, list):
        return [redact_data(item) for item in obj]
    return obj


def parse_cookie_flags(set_cookie_header: str) -> Dict[str, Any]:
    flags = {
        "HttpOnly": False,
        "Secure": False,
        "SameSite": None,
        "Path": None,
        "Domain": None,
        "Max-Age": None,
    }
    if not set_cookie_header:
        return flags

    parts = [p.strip() for p in set_cookie_header.split(";")]
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            k_lower = k.lower()
            if k_lower == "samesite":
                flags["SameSite"] = v
            elif k_lower == "path":
                flags["Path"] = v
            elif k_lower == "domain":
                flags["Domain"] = v
            elif k_lower == "max-age":
                flags["Max-Age"] = v
        else:
            if p.lower() == "httponly":
                flags["HttpOnly"] = True
            elif p.lower() == "secure":
                flags["Secure"] = True
    return flags


def detect_casing(obj: Any) -> str:
    if isinstance(obj, dict):
        keys = list(obj.keys())
        has_snake = any("_" in k for k in keys)
        has_camel = any(k != k.lower() and "_" not in k for k in keys)
        if has_snake and not has_camel:
            return "snake_case"
        if has_camel and not has_snake:
            return "camelCase"
        return "snake_case" if has_snake else "unknown/single_word"
    elif isinstance(obj, list) and obj and isinstance(obj[0], dict):
        return detect_casing(obj[0])
    return "unknown"


def record_step(name: str, response: httpx.Response, extra: Dict[str, Any] = None) -> Dict[str, Any]:
    try:
        data = response.json()
    except Exception:
        data = response.text

    cookie_header = response.headers.get("set-cookie", "")

    result = {
        "step": name,
        "status_code": response.status_code,
        "casing": detect_casing(data),
        "set_cookie_flags": parse_cookie_flags(cookie_header),
        "response_sample": redact_data(data),
    }
    if extra:
        result.update(extra)
    return result


def main():
    report = {
        "auth": [],
        "access_control": [],
        "data_endpoints": [],
    }

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    print("── 1. PROBING AUTH ──")
    reset_limiter()

    # 1.1 Login: Valid Admin
    res_admin = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("ADMIN_EMAIL", "admin_test@example.com"), "password": "Password123!"})
    report["auth"].append(record_step("login_valid_admin", res_admin))
    admin_token = res_admin.json().get("access_token")

    # 1.2 Login: Valid Teacher
    res_teacher = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("TEACHER_EMAIL", "teacher_test@example.com"), "password": "Password123!"})
    report["auth"].append(record_step("login_valid_teacher", res_teacher))
    teacher_token = res_teacher.json().get("access_token")

    # 1.3 Login: Valid Student
    res_student = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("STUDENT_EMAIL", "student_test@example.com"), "password": "Password123!"})
    report["auth"].append(record_step("login_valid_student", res_student))
    student_token = res_student.json().get("access_token")

    # 1.4 Login: Valid Parent
    res_parent = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("PARENT_EMAIL", "parent_test@example.com"), "password": "Password123!"})
    report["auth"].append(record_step("login_valid_parent", res_parent))
    parent_token = res_parent.json().get("access_token")

    # Batch 2 of logins: reset limiter
    client.close()
    reset_limiter()
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1.5 Login: Wrong Password
    res = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("ADMIN_EMAIL"), "password": "WrongPassword!999"})
    report["auth"].append(record_step("login_wrong_password", res))

    # 1.6 Login: Unknown User
    res = safe_request(client, "post", "/auth/login", json={"identifier": "nonexistent@example.com", "password": "Password123!"})
    report["auth"].append(record_step("login_unknown_user", res))

    # 1.7 Login: Empty Body (422)
    res = safe_request(client, "post", "/auth/login", json={})
    report["auth"].append(record_step("login_empty_body_422", res))

    # 1.8 Login: Suspended User
    res = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("SUSPENDED_EMAIL"), "password": "Password123!"})
    report["auth"].append(record_step("login_suspended_user", res))

    # Batch 3 of logins: reset limiter
    client.close()
    reset_limiter()
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1.9 Login: Deactivated User
    res = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("DEACTIVATED_EMAIL"), "password": "Password123!"})
    report["auth"].append(record_step("login_deactivated_user", res))

    # 1.10 Login: Locked User
    res = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("LOCKED_EMAIL"), "password": "Password123!"})
    report["auth"].append(record_step("login_locked_user", res))

    # 1.11 Login: User Needing Password Change
    res = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("MUST_CHANGE_EMAIL"), "password": "Password123!"})
    report["auth"].append(record_step("login_must_change_password", res))

    # 1.12 Login: Admin with 2FA Enabled
    res_2fa_login = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("ADMIN_2FA_EMAIL"), "password": "Password123!"})
    report["auth"].append(record_step("login_admin_2fa_prompt", res_2fa_login))
    temp_2fa_token = res_2fa_login.json().get("temp_token")

    # 1.13 Rate Limit 429 Test (trigger by exceeding limit on login)
    print("Testing 429 rate limit...")
    res_429 = None
    for _ in range(8):
        res_429 = safe_request(client, "post", "/auth/login", json={"identifier": "test@example.com", "password": "P"})
        if res_429.status_code == 429:
            break
    report["auth"].append(record_step("login_rate_limit_429", res_429))
    client.close()
    reset_limiter()
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1.14 2FA Verify: Wrong Code
    res = safe_request(client, "post", "/auth/2fa/verify", json={"code": "000000", "temp_token": temp_2fa_token})
    report["auth"].append(record_step("2fa_verify_wrong_code", res))

    # 1.15 2FA Verify: Correct Code
    totp = pyotp.TOTP("JBSWY3DPEHPK3PXP")
    valid_code = totp.now()
    res = safe_request(client, "post", "/auth/2fa/verify", json={"code": valid_code, "temp_token": temp_2fa_token})
    report["auth"].append(record_step("2fa_verify_correct_code", res))

    # 1.16 Refresh: Cookie-based success
    client.close()
    reset_limiter()
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    admin_session = httpx.Client(base_url=BASE_URL)
    safe_request(admin_session, "post", "/auth/login", json={"identifier": creds.get("ADMIN_EMAIL"), "password": "Password123!"})
    ref_res = safe_request(admin_session, "post", "/auth/refresh", json={})
    report["auth"].append(record_step("refresh_success_with_cookie", ref_res))

    # 1.17 Refresh: No Cookie
    clean_client = httpx.Client(base_url=BASE_URL)
    res = safe_request(clean_client, "post", "/auth/refresh", json={})
    report["auth"].append(record_step("refresh_no_cookie", res))

    # 1.18 /auth/me for each role
    # Get fresh tokens
    client.close()
    reset_limiter()
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    res_adm = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("ADMIN_EMAIL"), "password": "Password123!"})
    adm_tok = res_adm.json().get("access_token")
    res_tch = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("TEACHER_EMAIL"), "password": "Password123!"})
    tch_tok = res_tch.json().get("access_token")
    res_stu = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("STUDENT_EMAIL"), "password": "Password123!"})
    stu_tok = res_stu.json().get("access_token")
    res_par = safe_request(client, "post", "/auth/login", json={"identifier": creds.get("PARENT_EMAIL"), "password": "Password123!"})
    par_tok = res_par.json().get("access_token")

    for role_name, token in [("admin", adm_tok), ("teacher", tch_tok), ("student", stu_tok), ("parent", par_tok)]:
        res = safe_request(client, "get", "/auth/me", headers={"Authorization": f"Bearer {token}"})
        report["auth"].append(record_step(f"auth_me_{role_name}", res))

    # 1.19 Logout and /auth/me after logout
    client.close()
    reset_limiter()
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    temp_sess = httpx.Client(base_url=BASE_URL)
    t_login = safe_request(temp_sess, "post", "/auth/login", json={"identifier": creds.get("STUDENT_EMAIL"), "password": "Password123!"})
    t_tok = t_login.json().get("access_token")
    logout_res = safe_request(temp_sess, "post", "/auth/logout", json={}, headers={"Authorization": f"Bearer {t_tok}"})
    report["auth"].append(record_step("logout_success", logout_res))

    after_logout_me = safe_request(temp_sess, "get", "/auth/me", headers={"Authorization": f"Bearer {t_tok}"})
    report["auth"].append(record_step("auth_me_after_logout", after_logout_me))

    # 1.20 Accept Invite: Valid Token
    res = safe_request(client, "post", "/auth/accept-invite", json={"token": "valid-invite-token-1234567890", "new_password": "NewSecurePassword123!"})
    report["auth"].append(record_step("accept_invite_valid", res))

    # 1.21 Accept Invite: Used Token
    res = safe_request(client, "post", "/auth/accept-invite", json={"token": "used-invite-token-1234567890", "new_password": "NewSecurePassword123!"})
    report["auth"].append(record_step("accept_invite_used", res))

    # 1.22 Accept Invite: Expired Token
    res = safe_request(client, "post", "/auth/accept-invite", json={"token": "expired-invite-token-1234567890", "new_password": "NewSecurePassword123!"})
    report["auth"].append(record_step("accept_invite_expired", res))

    # 1.23 Accept Invite: Invalid Token
    res = safe_request(client, "post", "/auth/accept-invite", json={"token": "totally-fake-token-1234567890", "new_password": "NewSecurePassword123!"})
    report["auth"].append(record_step("accept_invite_invalid", res))

    # 1.24 Forgot Password: Existing vs Non-Existing Email
    res_exist = safe_request(client, "post", "/auth/forgot-password", json={"email": creds.get("STUDENT_EMAIL")})
    res_non_exist = safe_request(client, "post", "/auth/forgot-password", json={"email": "nobody_exists_here@example.com"})
    report["auth"].append(record_step("forgot_password_existing_email", res_exist, {"matches_non_existing": res_exist.json() == res_non_exist.json()}))
    report["auth"].append(record_step("forgot_password_non_existing_email", res_non_exist))

    # 1.25 Reset Password: Valid Token
    res = safe_request(client, "post", "/auth/reset-password", json={"token": "valid-reset-token-1234567890", "new_password": "Password123!"})
    report["auth"].append(record_step("reset_password_valid", res))

    # 1.26 Reset Password: Expired Token
    res = safe_request(client, "post", "/auth/reset-password", json={"token": "expired-reset-token-1234567890", "new_password": "Password123!"})
    report["auth"].append(record_step("reset_password_expired", res))

    # 1.27 Change Password: Valid & Failure
    res_chg_ok = safe_request(client, "post", "/auth/change-password", json={"old_password": "Password123!", "new_password": "NewPassword123!@#"}, headers={"Authorization": f"Bearer {adm_tok}"})
    report["auth"].append(record_step("change_password_success", res_chg_ok))

    res_chg_bad = safe_request(client, "post", "/auth/change-password", json={"old_password": "WrongOldPassword!", "new_password": "AnotherPassword123!"}, headers={"Authorization": f"Bearer {adm_tok}"})
    report["auth"].append(record_step("change_password_wrong_old_pwd", res_chg_bad))

    print("── 2. PROBING ACCESS CONTROL ──")

    # 2.1 Student token on admin endpoint
    res = safe_request(client, "get", "/admin/users", headers={"Authorization": f"Bearer {stu_tok}"})
    report["access_control"].append(record_step("student_on_admin_endpoint_expect_403", res))

    # 2.2 Teacher token on admin endpoint (expect 403)
    res = safe_request(client, "get", "/admin/users", headers={"Authorization": f"Bearer {tch_tok}"})
    report["access_control"].append(record_step("teacher_on_admin_endpoint_expect_403", res))

    # 2.3 No token
    res = safe_request(client, "get", "/admin/users")
    report["access_control"].append(record_step("no_token_expect_401", res))

    # 2.4 Expired token on protected route
    expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTUyMzQtMTIzNC0xMjM0NTY3ODkwMTIiLCJyb2xlIjoiYWRtaW4iLCJqdGkiOiJ0ZXN0LWV4cGlyZWQiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.fake-signature"
    res_exp = safe_request(client, "get", "/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    report["access_control"].append(record_step("expired_token_expect_401", res_exp))

    # 2.5 Student requesting Student profile
    res = safe_request(client, "get", "/students/me", headers={"Authorization": f"Bearer {stu_tok}"})
    report["access_control"].append(record_step("student_reads_own_me_profile", res))

    # 2.6 Teacher requesting student/me (expect 403)
    res = safe_request(client, "get", "/students/me", headers={"Authorization": f"Bearer {tch_tok}"})
    report["access_control"].append(record_step("teacher_reads_student_me_expect_403", res))

    print("── 3. PROBING DATA ENDPOINTS ──")

    # Clean up probe users before creating to ensure idempotent 201s
    from app.db.session import SessionLocal
    from sqlalchemy import text
    _db = SessionLocal()
    _db.execute(text('''
        DELETE FROM invites WHERE user_id IN (SELECT id FROM users WHERE email IN ('new_student_probe@example.com', 'new_student_probe2@example.com', 'new_teacher_probe@example.com', 'new_teacher_probe2@example.com'));
        DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email IN ('new_student_probe@example.com', 'new_student_probe2@example.com'));
        DELETE FROM teachers WHERE user_id IN (SELECT id FROM users WHERE email IN ('new_teacher_probe@example.com', 'new_teacher_probe2@example.com'));
        DELETE FROM users WHERE email IN ('new_student_probe@example.com', 'new_student_probe2@example.com', 'new_teacher_probe@example.com', 'new_teacher_probe2@example.com');
    '''))
    _db.commit()
    _db.close()

    # Re-authenticate admin with new password from change_password step
    admin_data_sess = httpx.Client(base_url=BASE_URL)
    res_adm_fresh = safe_request(admin_data_sess, "post", "/auth/login", json={"identifier": creds.get("ADMIN_EMAIL"), "password": "NewPassword123!@#"})
    fresh_adm_tok = res_adm_fresh.json().get("access_token")

    # 3.1 List users (pagination and envelope)
    res = safe_request(client, "get", "/admin/users?skip=0&limit=5", headers={"Authorization": f"Bearer {fresh_adm_tok}"})
    report["data_endpoints"].append(record_step("list_users_pagination_envelope", res))

    # 3.2 List applications
    res = safe_request(client, "get", "/admin/applications", headers={"Authorization": f"Bearer {fresh_adm_tok}"})
    report["data_endpoints"].append(record_step("list_applications_envelope", res))

    # 3.3 Parent children
    res = safe_request(client, "get", "/parents/me/children", headers={"Authorization": f"Bearer {par_tok}"})
    report["data_endpoints"].append(record_step("parent_get_children_envelope", res))

    # 3.4 Teacher classes
    res = safe_request(client, "get", "/teachers/me/classes", headers={"Authorization": f"Bearer {tch_tok}"})
    report["data_endpoints"].append(record_step("teacher_get_classes_envelope", res))

    # 3.5 Create Student (Admin)
    res = safe_request(client, "post", "/admin/students", json={
        "email": "new_student_probe@example.com",
        "first_name": "Alan",
        "last_name": "Kay",
        "dob": "2008-05-17",
        "class_name": "Grade 10",
        "section": "A",
        "department": "CS",
        "admission_date": "2026-09-01"
    }, headers={"Authorization": f"Bearer {fresh_adm_tok}"})
    report["data_endpoints"].append(record_step("create_student_success", res))

    # 3.6 Create Student 422 validation
    res = safe_request(client, "post", "/admin/students", json={
        "email": "not-an-email",
    }, headers={"Authorization": f"Bearer {fresh_adm_tok}"})
    report["data_endpoints"].append(record_step("create_student_422_validation", res))

    # 3.7 Create Teacher (Admin)
    res = safe_request(client, "post", "/admin/teachers", json={
        "email": "new_teacher_probe@example.com",
        "first_name": "Grace",
        "last_name": "Hopper",
        "department": "CS",
        "phone": "555-0999"
    }, headers={"Authorization": f"Bearer {fresh_adm_tok}"})
    report["data_endpoints"].append(record_step("create_teacher_success", res))

    # Write probe_report.json
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"✔ Completed probe report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
