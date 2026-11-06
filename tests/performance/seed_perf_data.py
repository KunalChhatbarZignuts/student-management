"""
Performance Test Seed Script
==============================
Populates student_mgmt_perf database with synthetic test data.

SAFE: Only targets student_mgmt_perf, never production student_mgmt.
All test accounts use 'perf.' prefix so they are identifiable.
Do NOT clean up without explicit user approval.

Usage:
    source venv/bin/activate && python tests/performance/seed_perf_data.py
"""

import uuid
import hashlib
import os
from datetime import date, datetime, timezone
from sqlalchemy import create_engine, text

# ── Target ONLY the perf database ─────────────────────────────────────────────
DB_URL = "postgresql+psycopg://postgres:password@localhost:5432/student_mgmt_perf"
PERF_PASSWORD_PLAIN = "PerfTest@123"

# BCrypt-compatible hash for PerfTest@123
# Generated offline so we don't need bcrypt installed in this script.
# passlib.hash.bcrypt.hash("PerfTest@123") equivalent:
# We'll use the app's own password utility instead.
def get_pw_hash(plain: str) -> str:
    """Hash password using Argon2id — same settings as app/core/security.py."""
    from argon2 import PasswordHasher
    ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32, salt_len=16)
    return ph.hash(plain)

PW_HASH = get_pw_hash(PERF_PASSWORD_PLAIN)
print(f"[seed] Password hash ready (length={len(PW_HASH)})")

engine = create_engine(DB_URL)

NOW = datetime.now(timezone.utc)

# ── IDs (fixed so re-runs are idempotent) ─────────────────────────────────────
AY_ID     = "00000000-0000-0000-0001-000000000001"
SHIFT_ID  = "00000000-0000-0000-0002-000000000001"

GRADE_IDS = [
    "00000000-0000-0000-0003-000000000001",  # Grade 1
    "00000000-0000-0000-0003-000000000002",  # Grade 2
    "00000000-0000-0000-0003-000000000003",  # Grade 3
]

SECTION_IDS = [
    "00000000-0000-0000-0004-000000000001",  # G1-A
    "00000000-0000-0000-0004-000000000002",  # G1-B
    "00000000-0000-0000-0004-000000000003",  # G2-A
]


def run(sql: str, params: dict = None, conn=None):
    conn.execute(text(sql), params or {})


with engine.begin() as conn:

    # ── 1. Academic Year ──────────────────────────────────────────────────────
    print("[seed] Inserting academic year...")
    conn.execute(text("""
        INSERT INTO academic_years (id, name, start_date, end_date, is_current, status, created_at, updated_at)
        VALUES (:id, :name, :sd, :ed, true, 'active', :now, :now)
        ON CONFLICT (id) DO NOTHING
    """), {"id": AY_ID, "name": "PERF-2025-26", "sd": date(2025, 6, 1), "ed": date(2026, 5, 31), "now": NOW})

    # ── 2. Shift ──────────────────────────────────────────────────────────────
    print("[seed] Inserting shift...")
    conn.execute(text("""
        INSERT INTO shifts (id, name, start_time, end_time, status, working_days, created_at, updated_at)
        VALUES (:id, 'Perf Morning', '08:00', '14:00', 'active',
                ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[],
                :now, :now)
        ON CONFLICT (id) DO NOTHING
    """), {"id": SHIFT_ID, "now": NOW})

    # ── 3. Grades ─────────────────────────────────────────────────────────────
    print("[seed] Inserting grades...")
    for i, gid in enumerate(GRADE_IDS, 1):
        conn.execute(text("""
            INSERT INTO grades (id, name, level, code, shift_id, academic_year_id, status, created_at, updated_at)
            VALUES (:id, :name, :lvl, :code, :sid, :ayid, 'active', :now, :now)
            ON CONFLICT (id) DO NOTHING
        """), {"id": gid, "name": f"Perf Grade {i}", "lvl": i, "code": f"PG{i}",
               "sid": SHIFT_ID, "ayid": AY_ID, "now": NOW})

    # ── 4. Sections ───────────────────────────────────────────────────────────
    print("[seed] Inserting sections...")
    section_defs = [
        (SECTION_IDS[0], GRADE_IDS[0], "A", "PG1-A"),
        (SECTION_IDS[1], GRADE_IDS[0], "B", "PG1-B"),
        (SECTION_IDS[2], GRADE_IDS[1], "A", "PG2-A"),
    ]
    for sid, gid, name, code in section_defs:
        conn.execute(text("""
            INSERT INTO sections (id, grade_id, name, code, academic_year_id, class_capacity, status, created_at, updated_at)
            VALUES (:id, :gid, :name, :code, :ayid, 40, 'active', :now, :now)
            ON CONFLICT (id) DO NOTHING
        """), {"id": sid, "gid": gid, "name": name, "code": code, "ayid": AY_ID, "now": NOW})

    # ── 5. Admin user (no profile table) ─────────────────────────────────────
    print("[seed] Inserting admin user...")
    admin_uid = "00000000-0000-0000-0010-000000000001"
    conn.execute(text("""
        INSERT INTO users (id, email, password_hash, role, status, must_change_password, failed_login_count, created_at, updated_at)
        VALUES (:id, 'perf.admin@perf.test', :pw, 'admin', 'active', false, 0, :now, :now)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    """), {"id": admin_uid, "pw": PW_HASH, "now": NOW})

    # ── 6. Super Admin ────────────────────────────────────────────────────────
    sadmin_uid = "00000000-0000-0000-0010-000000000002"
    conn.execute(text("""
        INSERT INTO users (id, email, password_hash, role, status, must_change_password, failed_login_count, created_at, updated_at)
        VALUES (:id, 'perf.superadmin@perf.test', :pw, 'super_admin', 'active', false, 0, :now, :now)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    """), {"id": sadmin_uid, "pw": PW_HASH, "now": NOW})

    # ── 7. Teachers (10) ──────────────────────────────────────────────────────
    print("[seed] Inserting 10 teachers...")
    for i in range(1, 11):
        uid = f"00000000-0000-0000-0020-{i:012d}"
        tid = f"00000000-0000-0000-0021-{i:012d}"
        email = f"perf.teacher{i:02d}@perf.test"
        conn.execute(text("""
            INSERT INTO users (id, email, password_hash, role, status, must_change_password, failed_login_count, created_at, updated_at)
            VALUES (:id, :email, :pw, 'teacher', 'active', false, 0, :now, :now)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        """), {"id": uid, "email": email, "pw": PW_HASH, "now": NOW})
        conn.execute(text("""
            INSERT INTO teachers (id, employee_code, user_id, first_name, last_name, department, phone, created_at, updated_at)
            VALUES (:id, :ec, :uid, :fn, :ln, 'Perf Dept', '0000000000', :now, :now)
            ON CONFLICT (id) DO NOTHING
        """), {"id": tid, "ec": f"PERF-T{i:03d}", "uid": uid,
               "fn": f"PerfTeacher{i}", "ln": "Test", "now": NOW})

    # ── 8. Students (30) ──────────────────────────────────────────────────────
    print("[seed] Inserting 30 students...")
    grade_section_pairs = [
        (GRADE_IDS[0], SECTION_IDS[0]),
        (GRADE_IDS[0], SECTION_IDS[1]),
        (GRADE_IDS[1], SECTION_IDS[2]),
    ]
    for i in range(1, 31):
        uid  = f"00000000-0000-0000-0030-{i:012d}"
        stid = f"00000000-0000-0000-0031-{i:012d}"
        email = f"perf.student{i:02d}@perf.test"
        gid, secid = grade_section_pairs[i % 3]
        conn.execute(text("""
            INSERT INTO users (id, email, password_hash, role, status, must_change_password, failed_login_count, created_at, updated_at)
            VALUES (:id, :email, :pw, 'student', 'active', false, 0, :now, :now)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        """), {"id": uid, "email": email, "pw": PW_HASH, "now": NOW})
        conn.execute(text("""
            INSERT INTO students (id, student_code, user_id, first_name, last_name, dob,
                class_name, section, department, status, enrollment_number, gender,
                current_grade_id, current_section_id, admission_date, created_at, updated_at)
            VALUES (:id, :sc, :uid, :fn, :ln, :dob,
                'Perf Class', 'A', 'General', 'active', :en, 'male',
                :gid, :secid, :ad, :now, :now)
            ON CONFLICT (id) DO NOTHING
        """), {"id": stid, "sc": f"PERF-S{i:04d}", "uid": uid,
               "fn": f"PerfStudent{i}", "ln": "Test",
               "dob": date(2010, 1, i % 28 + 1),
               "en": f"PERF2025{i:04d}",
               "gid": gid, "secid": secid,
               "ad": date(2025, 6, 1), "now": NOW})

    # ── 9. Parents (10) ───────────────────────────────────────────────────────
    print("[seed] Inserting 10 parents...")
    for i in range(1, 11):
        uid = f"00000000-0000-0000-0040-{i:012d}"
        pid = f"00000000-0000-0000-0041-{i:012d}"
        email = f"perf.parent{i:02d}@perf.test"
        conn.execute(text("""
            INSERT INTO users (id, email, password_hash, role, status, must_change_password, failed_login_count, created_at, updated_at)
            VALUES (:id, :email, :pw, 'parent', 'active', false, 0, :now, :now)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        """), {"id": uid, "email": email, "pw": PW_HASH, "now": NOW})
        conn.execute(text("""
            INSERT INTO parents (id, user_id, first_name, last_name, phone, created_at, updated_at)
            VALUES (:id, :uid, :fn, :ln, '0000000000', :now, :now)
            ON CONFLICT (id) DO NOTHING
        """), {"id": pid, "uid": uid, "fn": f"PerfParent{i}", "ln": "Test", "now": NOW})

print("[seed] ✅ All perf data seeded successfully into student_mgmt_perf!")
print(f"\n  Admin:      perf.admin@perf.test")
print(f"  Teachers:   perf.teacher01@perf.test  ..  perf.teacher10@perf.test")
print(f"  Students:   perf.student01@perf.test  ..  perf.student30@perf.test")
print(f"  Parents:    perf.parent01@perf.test   ..  perf.parent10@perf.test")
print(f"  Password:   {PERF_PASSWORD_PLAIN}")
