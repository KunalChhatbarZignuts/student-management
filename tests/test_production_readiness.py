import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_liveness_probe():
    """Validates that GET /health returns 200 OK and service metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == settings.PROJECT_NAME
    assert "timestamp" in data


def test_readiness_probe():
    """Validates that GET /health/ready connects to database and returns HTTP 200."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "timestamp" in data

    # Verify alias /ready
    alias_res = client.get("/ready")
    assert alias_res.status_code == 200
    assert alias_res.json()["status"] == "ready"


def test_root_endpoint_metadata():
    """Validates GET / returns service status, health link, and docs URLs."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["health"] == "/health"
    assert data["readiness"] == "/health/ready"


def test_owasp_security_headers_present():
    """Validates standard OWASP security headers on HTTP responses."""
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_openapi_schema_generation():
    """Validates that OpenAPI schema generates completely without missing model references."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "openapi" in schema
    assert "paths" in schema
    assert len(schema["paths"]) > 50


def test_domain_routers_mounted_and_secured():
    """
    Verifies that all 11 core domain routers are properly mounted and return
    appropriate HTTP status codes (e.g., 401 Unauthorized instead of 404 Not Found).
    """
    test_endpoints = [
        # (method, path, expected_unauth_status)
        ("GET", "/api/v1/students/me", 401),
        ("GET", "/api/v1/teachers/me/classes", 401),
        ("GET", "/api/v1/admin/grades", 401),
        ("GET", "/api/v1/teacher/attendance/sections", 401),
        ("GET", "/api/v1/admin/examinations", 401),
        ("GET", "/api/v1/admin/fees/dashboard", 401),
        ("GET", "/api/v1/diary/entries", 401),
        ("GET", "/api/v1/teacher/online-classes", 401),
        ("GET", "/api/v1/student/assistant/conversations", 401),
        ("GET", "/api/v1/admin/audit-logs", 401),
    ]

    for method, path, expected_status in test_endpoints:
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        assert res.status_code == expected_status, (
            f"Expected {expected_status} for {method} {path}, got {res.status_code} ({res.text})"
        )


def test_cors_preflight_handling():
    """Validates CORS preflight OPTIONS request."""
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "POST" in response.headers.get("access-control-allow-methods", "")
