#!/usr/bin/env python3
"""
Comprehensive Live Production End-to-End Test Suite.
Directly hits running production instances of Backend (8000), Admin (3000), and Student Portal (3001).
"""
import sys
import requests

BACKEND_URL = "http://127.0.0.1:8000"
ADMIN_URL = "http://localhost:3000"
PORTAL_URL = "http://localhost:3001"

passed = 0
failed = 0

def check(name: str, condition: bool, details: str = ""):
    global passed, failed
    if condition:
        print(f"  [PASS] {name} {details}")
        passed += 1
    else:
        print(f"  [FAIL] {name} {details}")
        failed += 1

print("=" * 80)
print("RUNNING LIVE PRODUCTION END-TO-END HTTP TESTS")
print("=" * 80)

# 1. Health & Readiness
print("\n1. Testing Backend System Health & Readiness Probes:")
try:
    res = requests.get(f"{BACKEND_URL}/health", timeout=5)
    check("GET /health (Liveness)", res.status_code == 200 and res.json().get("status") == "ok", f"-> {res.status_code}")
except Exception as e:
    check("GET /health", False, str(e))

try:
    res = requests.get(f"{BACKEND_URL}/health/ready", timeout=5)
    data = res.json()
    check("GET /health/ready (Database Connectivity)", res.status_code == 200 and data.get("database") == "connected", f"-> {data.get('database')}")
except Exception as e:
    check("GET /health/ready", False, str(e))

# 2. Security Headers on Live Server
print("\n2. Testing OWASP Security Headers on Live HTTP Traffic:")
try:
    res = requests.get(f"{BACKEND_URL}/health", timeout=5)
    check("Header X-Content-Type-Options", res.headers.get("x-content-type-options") == "nosniff")
    check("Header X-Frame-Options", res.headers.get("x-frame-options") == "DENY")
    check("Header Referrer-Policy", "origin" in res.headers.get("referrer-policy", ""))
except Exception as e:
    check("Security Headers", False, str(e))

# 3. OpenAPI Schema & API Metadata
print("\n3. Testing OpenAPI Specification & Root Metadata:")
try:
    res = requests.get(f"{BACKEND_URL}/", timeout=5)
    check("GET / (Root Metadata)", res.status_code == 200 and "health" in res.json())
    schema_res = requests.get(f"{BACKEND_URL}/openapi.json", timeout=5)
    check("GET /openapi.json (OpenAPI Schema)", schema_res.status_code == 200 and len(schema_res.json().get("paths", {})) > 50)
except Exception as e:
    check("Root & OpenAPI", False, str(e))

# 4. Multi-Role Authentication & Protected Endpoints
print("\n4. Testing Multi-Role Authentication & Core Protected APIs:")

import app.modules.models
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.modules.auth.models import User

db = SessionLocal()

# Verify live database users for each role
super_admin_user = db.query(User).filter(User.role.in_(["super_admin", "admin"]), User.status == "active").first()
teacher_user = db.query(User).filter(User.role == "teacher", User.status == "active").first()
student_user = db.query(User).filter(User.role == "student", User.status == "active").first()
parent_user = db.query(User).filter(User.role == "parent", User.status == "active").first()

# Generate valid production JWT Bearer tokens
super_token = create_access_token(user_id=super_admin_user.id, role=super_admin_user.role) if super_admin_user else None
teacher_token = create_access_token(user_id=teacher_user.id, role=teacher_user.role) if teacher_user else None
student_token = create_access_token(user_id=student_user.id, role=student_user.role) if student_user else None
parent_token = create_access_token(user_id=parent_user.id, role=parent_user.role) if parent_user else None

# Super Admin Test
check("Super Admin User Authenticated", super_admin_user is not None)
if super_token:
    audit_res = requests.get(f"{BACKEND_URL}/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {super_token}"}, timeout=5)
    check("Super Admin Audit Logs API Access", audit_res.status_code == 200, f"({len(audit_res.json())} entries)")

# Teacher Test
check("Teacher User Authenticated", teacher_user is not None)
if teacher_token:
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    classes_res = requests.get(f"{BACKEND_URL}/api/v1/teachers/me/classes", headers=t_headers, timeout=5)
    check("Teacher Classes API Access", classes_res.status_code == 200)
    diary_res = requests.get(f"{BACKEND_URL}/api/v1/diary/entries", headers=t_headers, timeout=5)
    check("Teacher Diary Dashboard API Access", diary_res.status_code == 200)

# Student Test
check("Student User Authenticated", student_user is not None)
if student_token:
    s_headers = {"Authorization": f"Bearer {student_token}"}
    profile_res = requests.get(f"{BACKEND_URL}/api/v1/students/me", headers=s_headers, timeout=5)
    check("Student Profile API Access", profile_res.status_code == 200)
    routine_res = requests.get(f"{BACKEND_URL}/api/v1/students/me/learning-assistant/daily-routine", headers=s_headers, timeout=5)
    check("Student AI Learning Routine API Access", routine_res.status_code == 200)
    overview_res = requests.get(f"{BACKEND_URL}/api/v1/students/me/learning-assistant/overview", headers=s_headers, timeout=5)
    check("Student AI Learning Overview API Access", overview_res.status_code == 200)

# Parent Test
check("Parent User Authenticated", parent_user is not None)
if parent_token:
    p_headers = {"Authorization": f"Bearer {parent_token}"}
    p_diary = requests.get(f"{BACKEND_URL}/api/v1/diary/parent/entries", headers=p_headers, timeout=5)
    check("Parent Diary Feed API Access", p_diary.status_code == 200)

# 5. Live Frontend HTTP Probes
print("\n5. Testing Live Frontend Application Availability:")
try:
    admin_login = requests.get(f"{ADMIN_URL}/login", timeout=5)
    check("Admin Frontend (Port 3000) /login Response", admin_login.status_code == 200)
    admin_dash = requests.get(f"{ADMIN_URL}/", timeout=5, allow_redirects=True)
    check("Admin Frontend (Port 3000) Root Page Response", admin_dash.status_code == 200)
except Exception as e:
    check("Admin Frontend", False, str(e))

try:
    portal_login = requests.get(f"{PORTAL_URL}/login", timeout=5)
    check("Student Portal (Port 3001) /login Response", portal_login.status_code == 200)
    portal_dash = requests.get(f"{PORTAL_URL}/", timeout=5, allow_redirects=True)
    check("Student Portal (Port 3001) Root Page Response", portal_dash.status_code == 200)
except Exception as e:
    check("Student Portal", False, str(e))

print("\n" + "=" * 80)
print(f"RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 80)

if failed > 0:
    sys.exit(1)
sys.exit(0)
