import datetime as dt
import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section
from app.models.fee import (
    FeeComponent,
    FeeInstallment,
    FeeStructure,
    FeeStructureItem,
    StudentFeeAssignment,
)
from app.models.user import User, UserRole, UserStatus


def _create_token(user: User) -> str:
    return create_access_token(user.id, user.role)


@pytest.fixture
def fee_setup(db: Session):
    # Admin User
    admin = User(
        email=f"admin_fee_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Admin@123"),
    )
    # Teacher User
    teacher_user = User(
        email=f"teacher_fee_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Teacher@123"),
    )
    db.add_all([admin, teacher_user])
    db.flush()

    # Academic Year
    ay = AcademicYear(
        name=f"AY-FEE-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)
    db.flush()

    # Grade 2
    grade_2 = Grade(
        name=f"Grade 2-{uuid.uuid4().hex[:4]}",
        code=f"G2-{uuid.uuid4().hex[:4]}",
        level=2,
        academic_year_id=ay.id,
        status="active",
    )
    # Grade 3
    grade_3 = Grade(
        name=f"Grade 3-{uuid.uuid4().hex[:4]}",
        code=f"G3-{uuid.uuid4().hex[:4]}",
        level=3,
        academic_year_id=ay.id,
        status="active",
    )
    db.add_all([grade_2, grade_3])
    db.flush()

    # Sections
    sec_2a = Section(
        grade_id=grade_2.id,
        name="A",
        code=f"G2A-{uuid.uuid4().hex[:4]}",
        academic_year_id=ay.id,
        class_capacity=40,
        status="active",
    )
    sec_3a = Section(
        grade_id=grade_3.id,
        name="A",
        code=f"G3A-{uuid.uuid4().hex[:4]}",
        academic_year_id=ay.id,
        class_capacity=40,
        status="active",
    )
    db.add_all([sec_2a, sec_3a])
    db.commit()

    return {
        "admin": admin,
        "teacher": teacher_user,
        "admin_token": _create_token(admin),
        "teacher_token": _create_token(teacher_user),
        "academic_year": ay,
        "grade_2": grade_2,
        "grade_3": grade_3,
        "section_2a": sec_2a,
        "section_3a": sec_3a,
    }


def test_fee_components_management(client: TestClient, fee_setup: dict):
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Tuition Component
    comp_code = f"TUIT_{uuid.uuid4().hex[:4].upper()}"
    res = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={
            "name": "Base Tuition Fee",
            "code": comp_code,
            "fee_type": "tuition",
            "payment_frequency": "annual",
            "is_mandatory": True,
            "is_recurring": True,
            "status": "active",
        },
    )
    assert res.status_code == 201, res.text
    comp_id = res.json()["id"]
    assert res.json()["name"] == "Base Tuition Fee"

    # 2. List components
    res_list = client.get("/api/v1/admin/fees/components", headers=headers)
    assert res_list.status_code == 200
    assert any(c["id"] == comp_id for c in res_list.json())

    # 3. Update component
    res_up = client.put(
        f"/api/v1/admin/fees/components/{comp_id}",
        headers=headers,
        json={"name": "Annual Tuition Fee"},
    )
    assert res_up.status_code == 200
    assert res_up.json()["name"] == "Annual Tuition Fee"

    # 4. Toggle status
    res_stat = client.patch(
        f"/api/v1/admin/fees/components/{comp_id}/status?status=inactive",
        headers=headers,
    )
    assert res_stat.status_code == 200
    assert res_stat.json()["status"] == "inactive"


def test_grade_wise_fee_structures_and_lookup(client: TestClient, fee_setup: dict):
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ay_id = str(fee_setup["academic_year"].id)
    g2_id = str(fee_setup["grade_2"].id)
    g3_id = str(fee_setup["grade_3"].id)

    # Create components
    c_tuition = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Tuition", "code": f"T_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()

    c_admission = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Admission", "code": f"A_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()

    c_transport = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Transport", "code": f"TR_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": False},
    ).json()

    # 1. Create Grade 2 Fee Structure: Tuition=20000, Admission=5000, Transport=3000 (Optional)
    res_g2 = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "name": "Grade 2 Standard Fee Structure",
            "effective_date": "2026-04-01",
            "status": "active",
            "items": [
                {"fee_component_id": c_tuition["id"], "amount": 20000.0, "is_mandatory": True},
                {"fee_component_id": c_admission["id"], "amount": 5000.0, "is_mandatory": True},
                {"fee_component_id": c_transport["id"], "amount": 3000.0, "is_mandatory": False},
            ],
        },
    )
    assert res_g2.status_code == 201, res_g2.text
    # Mandatory total = 20000 + 5000 = 25000
    assert float(res_g2.json()["total_amount"]) == 25000.0

    # 2. Create Grade 3 Fee Structure: Tuition=24000, Admission=5000, Transport=3500 (Optional)
    res_g3 = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "academic_year_id": ay_id,
            "grade_id": g3_id,
            "name": "Grade 3 Standard Fee Structure",
            "effective_date": "2026-04-01",
            "status": "active",
            "items": [
                {"fee_component_id": c_tuition["id"], "amount": 24000.0, "is_mandatory": True},
                {"fee_component_id": c_admission["id"], "amount": 5000.0, "is_mandatory": True},
                {"fee_component_id": c_transport["id"], "amount": 3500.0, "is_mandatory": False},
            ],
        },
    )
    assert res_g3.status_code == 201
    assert float(res_g3.json()["total_amount"]) == 29000.0

    # 3. Lookup active structure for Grade 2
    res_lookup_g2 = client.get(
        f"/api/v1/admin/fees/structures/active?grade_id={g2_id}&academic_year_id={ay_id}",
        headers=headers,
    )
    assert res_lookup_g2.status_code == 200
    assert res_lookup_g2.json()["id"] == res_g2.json()["id"]

    # 4. Lookup active structure for Grade 3
    res_lookup_g3 = client.get(
        f"/api/v1/admin/fees/structures/active?grade_id={g3_id}&academic_year_id={ay_id}",
        headers=headers,
    )
    assert res_lookup_g3.status_code == 200
    assert res_lookup_g3.json()["id"] == res_g3.json()["id"]


def test_admission_with_fee_assignment_and_adjustments(client: TestClient, fee_setup: dict):
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ay_id = str(fee_setup["academic_year"].id)
    g2_id = str(fee_setup["grade_2"].id)
    s2a_id = str(fee_setup["section_2a"].id)

    # Setup components
    c_tuition = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Tuition", "code": f"TUI_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()
    c_transport = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Transport", "code": f"TRA_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": False},
    ).json()

    # Create Grade 2 structure: Base Tuition = ₹30,000, Transport (optional) = ₹5,000
    struct = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "name": "Grade 2 Structure with Adjustments",
            "effective_date": "2026-04-01",
            "status": "active",
            "items": [
                {"fee_component_id": c_tuition["id"], "amount": 30000.0, "is_mandatory": True},
                {"fee_component_id": c_transport["id"], "amount": 5000.0, "is_mandatory": False},
            ],
        },
    ).json()

    # Admit Student with:
    # 1. Base mandatory: 30000
    # 2. Selected optional transport: 5000 -> Base = 35000
    # 3. 10% Scholarship concession on base (10% of 35000 = 3500)
    # 4. Fixed sibling discount of 1500
    # 5. Additional lab charge of 1000
    # Final payable = 35000 - 3500 - 1500 + 1000 = 31000
    # Installment frequency: quarterly (4 installments of 7750 each)
    p_email = f"parent_fee_{uuid.uuid4().hex[:6]}@example.com"
    adm_payload = {
        "student": {
            "first_name": "Arjun",
            "last_name": "Sharma",
            "dob": "2018-05-15",
            "gender": "Male",
            "department": "Primary",
        },
        "parents": [
            {
                "first_name": "Rajesh",
                "last_name": "Sharma",
                "email": p_email,
                "relationship_type": "Father",
                "is_primary_guardian": True,
            }
        ],
        "academic_year_id": ay_id,
        "grade_id": g2_id,
        "section_id": s2a_id,
        "admission_date": "2026-04-05",
        "create_student_account": True,
        "fee_assignment": {
            "fee_structure_id": struct["id"],
            "selected_component_ids": [c_transport["id"]],
            "installment_frequency": "quarterly",
            "adjustments": [
                {
                    "adjustment_type": "CONCESSION_SCHOLARSHIP",
                    "category": "concession",
                    "description": "10% Academic Scholarship",
                    "calculation_type": "percentage",
                    "rate": 10.0,
                    "amount": 0.0,
                },
                {
                    "adjustment_type": "DISCOUNT_FIXED",
                    "category": "discount",
                    "description": "Sibling Discount",
                    "calculation_type": "fixed",
                    "amount": 1500.0,
                },
                {
                    "adjustment_type": "ADDITIONAL_CHARGE",
                    "category": "additional_charge",
                    "description": "Robotics & Lab Kit",
                    "calculation_type": "fixed",
                    "amount": 1000.0,
                },
            ],
        },
    }

    res_adm = client.post("/api/v1/admin/admissions", headers=headers, json=adm_payload)
    assert res_adm.status_code == 201, res_adm.text
    adm_data = res_adm.json()

    assert adm_data["fee_assignment"] is not None
    f_assign = adm_data["fee_assignment"]
    assert float(f_assign["base_amount"]) == 35000.0
    # Total discount = 3500 (scholarship) + 1500 (sibling) = 5000
    assert float(f_assign["total_discount"]) == 5000.0
    assert float(f_assign["total_additional"]) == 1000.0
    assert float(f_assign["final_payable_amount"]) == 31000.0

    # Installments: 4 quarterly installments reconciling to 31000
    insts = f_assign["installments"]
    assert len(insts) == 4
    total_insts = sum(float(i["amount"]) for i in insts)
    assert total_insts == 31000.0

    # Verify querying assignments list
    res_list = client.get(f"/api/v1/admin/fees/assignments?grade_id={g2_id}", headers=headers)
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1


def test_fee_validation_rules(client: TestClient, fee_setup: dict):
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ay_id = str(fee_setup["academic_year"].id)
    g2_id = str(fee_setup["grade_2"].id)
    s2a_id = str(fee_setup["section_2a"].id)

    # Setup components
    c_tuition = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Tuition", "code": f"TUI_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()

    struct = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "name": "Fee Validation Test Structure",
            "effective_date": "2026-04-01",
            "status": "active",
            "items": [
                {"fee_component_id": c_tuition["id"], "amount": 10000.0, "is_mandatory": True},
            ],
        },
    ).json()

    base_adm = {
        "student": {
            "first_name": "Test",
            "last_name": "Student",
            "dob": "2018-01-01",
            "gender": "Female",
        },
        "parents": [
            {
                "first_name": "Parent",
                "last_name": "One",
                "email": f"p_val_{uuid.uuid4().hex[:6]}@example.com",
                "relationship_type": "Mother",
                "is_primary_guardian": True,
            }
        ],
        "academic_year_id": ay_id,
        "grade_id": g2_id,
        "section_id": s2a_id,
        "admission_date": "2026-04-05",
    }

    # 1. Discount exceeding base amount -> Should return 400
    bad_payload_excess = dict(base_adm)
    bad_payload_excess["fee_assignment"] = {
        "fee_structure_id": struct["id"],
        "adjustments": [
            {
                "adjustment_type": "DISCOUNT_FIXED",
                "category": "discount",
                "description": "Too large discount",
                "calculation_type": "fixed",
                "amount": 15000.0,  # Base is only 10000!
            }
        ],
    }
    res_bad = client.post("/api/v1/admin/admissions", headers=headers, json=bad_payload_excess)
    assert res_bad.status_code == 400
    assert "cannot exceed the base fee" in res_bad.text

    # 2. Percentage rate > 100% -> Should return 400
    bad_payload_pct = dict(base_adm)
    bad_payload_pct["fee_assignment"] = {
        "fee_structure_id": struct["id"],
        "adjustments": [
            {
                "adjustment_type": "DISCOUNT_PERCENTAGE",
                "category": "discount",
                "description": "Invalid rate",
                "calculation_type": "percentage",
                "rate": 150.0,
                "amount": 0.0,
            }
        ],
    }
    res_bad_pct = client.post("/api/v1/admin/admissions", headers=headers, json=bad_payload_pct)
    assert res_bad_pct.status_code in [400, 422]


def test_fee_immutability(client: TestClient, fee_setup: dict, db: Session):
    """Updating a Grade-wise fee structure must not modify existing student fee assignments."""
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ay_id = str(fee_setup["academic_year"].id)
    g2_id = str(fee_setup["grade_2"].id)
    s2a_id = str(fee_setup["section_2a"].id)

    c_tuition = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Tuition", "code": f"TUI_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()

    struct = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "name": "Original Grade 2 Fees",
            "effective_date": "2026-04-01",
            "status": "active",
            "items": [{"fee_component_id": c_tuition["id"], "amount": 25000.0, "is_mandatory": True}],
        },
    ).json()

    # Admit student
    adm = client.post(
        "/api/v1/admin/admissions",
        headers=headers,
        json={
            "student": {"first_name": "Kavita", "last_name": "Rao", "dob": "2018-02-02", "gender": "Female"},
            "parents": [{"first_name": "Anil", "last_name": "Rao", "email": f"anil_{uuid.uuid4().hex[:6]}@example.com", "relationship_type": "Father", "is_primary_guardian": True}],
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "section_id": s2a_id,
            "admission_date": "2026-04-10",
            "fee_assignment": {"fee_structure_id": struct["id"]},
        },
    ).json()

    assignment_id = adm["fee_assignment"]["id"]

    # Now create a new revised active structure with increased tuition = 35000
    client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "name": "Revised Grade 2 Fees",
            "effective_date": "2026-04-01",
            "status": "active",
            "items": [{"fee_component_id": c_tuition["id"], "amount": 35000.0, "is_mandatory": True}],
        },
    )

    # Check student assignment remains 25000
    res_assign = client.get(f"/api/v1/admin/fees/assignments/{assignment_id}", headers=headers)
    assert res_assign.status_code == 200
    assert float(res_assign.json()["final_payable_amount"]) == 25000.0


def test_fees_role_authorization(client: TestClient, fee_setup: dict):
    """Teachers and unauthenticated users must not be able to modify fee structures."""
    teacher_token = fee_setup["teacher_token"]
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # Attempt to create fee component as teacher -> 403 Forbidden
    res = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Hacked Fee", "code": "HACK", "is_mandatory": True},
    )
    assert res.status_code == 403

    # Attempt to view dashboard as teacher -> 403 Forbidden
    res_dash = client.get("/api/v1/admin/fees/dashboard", headers=headers)
    assert res_dash.status_code == 403


def test_remove_student_fee_adjustment(client: TestClient, fee_setup: dict):
    """Admin can apply and subsequently remove an adjustment, recalculating balance and installments."""
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ay_id = str(fee_setup["academic_year"].id)
    g2_id = str(fee_setup["grade_2"].id)
    s2a_id = str(fee_setup["section_2a"].id)

    # 1. Create component & structure
    comp = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Tuition Adj Test", "code": f"TUI_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()

    struct = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "name": f"Adj Structure {uuid.uuid4().hex[:4]}",
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "installment_frequency": "quarterly",
            "items": [{"fee_component_id": comp["id"], "amount": 40000.0, "is_mandatory": True}],
        },
    ).json()

    # 2. Register student with fee assignment via /admin/admissions
    p_email = f"parent_adj_{uuid.uuid4().hex[:6]}@example.com"
    adm_payload = {
        "student": {
            "first_name": "TestAdj",
            "last_name": "Student",
            "dob": "2018-04-12",
            "gender": "Male",
            "department": "Primary",
        },
        "parents": [
            {
                "first_name": "Parent",
                "last_name": "Adj",
                "email": p_email,
                "phone": "9988776655",
                "relationship": "Father",
                "is_emergency_contact": True,
            }
        ],
        "academic_year_id": ay_id,
        "grade_id": g2_id,
        "section_id": s2a_id,
        "admission_date": "2026-04-01",
        "fee_assignment": {
            "fee_structure_id": struct["id"],
            "selected_component_ids": [comp["id"]],
            "installment_frequency": "quarterly",
        },
    }
    student_res = client.post("/api/v1/admin/admissions", headers=headers, json=adm_payload)
    assert student_res.status_code == 201, student_res.text
    assignment_id = student_res.json()["fee_assignment"]["id"]

    # 3. Apply an additional charge adjustment of 5,000
    adj_res = client.post(
        f"/api/v1/admin/fees/assignments/{assignment_id}/adjustments",
        headers=headers,
        json={
            "adjustment_type": "transport_addon",
            "category": "additional_charge",
            "description": "Bus Route Extra Charge",
            "calculation_type": "fixed",
            "amount": 5000.0,
        },
    )
    assert adj_res.status_code == 201
    adj_data = adj_res.json()
    assert float(adj_data["final_payable_amount"]) == 45000.0
    adjustment_id = adj_data["adjustments"][0]["id"]

    # 4. Remove the adjustment via DELETE
    del_res = client.delete(
        f"/api/v1/admin/fees/assignments/{assignment_id}/adjustments/{adjustment_id}",
        headers=headers,
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert float(del_data["final_payable_amount"]) == 40000.0
    assert float(del_data["total_additional"]) == 0.0
    assert len(del_data["adjustments"]) == 0


def test_student_update_grade_syncs_fee_assignment_and_installments(client: TestClient, fee_setup: dict, db: Session):
    """When a student's grade/section is updated via patch, their fee assignment and installments must synchronize in-place."""
    token = fee_setup["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ay_id = str(fee_setup["academic_year"].id)
    g2_id = str(fee_setup["grade_2"].id)
    s2a_id = str(fee_setup["section_2a"].id)
    g3_id = str(fee_setup["grade_3"].id)
    s3a_id = str(fee_setup["section_3a"].id)

    # 1. Create fee component
    comp = client.post(
        "/api/v1/admin/fees/components",
        headers=headers,
        json={"name": "Tuition Fee Sync", "code": f"TUI_{uuid.uuid4().hex[:4].upper()}", "is_mandatory": True},
    ).json()

    # 2. Create Grade 2 Fee Structure: ₹40,000 (quarterly)
    struct_g2 = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "name": f"G2 Structure {uuid.uuid4().hex[:4]}",
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "installment_frequency": "quarterly",
            "items": [{"fee_component_id": comp["id"], "amount": 40000.0, "is_mandatory": True}],
        },
    ).json()

    # 3. Create Grade 3 Fee Structure: ₹60,000 (bi-annual)
    struct_g3 = client.post(
        "/api/v1/admin/fees/structures",
        headers=headers,
        json={
            "name": f"G3 Structure {uuid.uuid4().hex[:4]}",
            "academic_year_id": ay_id,
            "grade_id": g3_id,
            "installment_frequency": "bi-annual",
            "items": [{"fee_component_id": comp["id"], "amount": 60000.0, "is_mandatory": True}],
        },
    ).json()

    # 4. Admit student into Grade 2
    p_email = f"parent_sync_{uuid.uuid4().hex[:6]}@example.com"
    adm_res = client.post(
        "/api/v1/admin/admissions",
        headers=headers,
        json={
            "student": {
                "first_name": "DevSync",
                "last_name": "Tester",
                "dob": "2018-01-01",
                "gender": "Male",
                "department": "Primary",
            },
            "parents": [
                {
                    "first_name": "Parent",
                    "last_name": "Tester",
                    "email": p_email,
                    "phone": "9998887776",
                    "relationship": "Father",
                    "is_emergency_contact": True,
                }
            ],
            "academic_year_id": ay_id,
            "grade_id": g2_id,
            "section_id": s2a_id,
            "admission_date": "2026-04-01",
            "fee_assignment": {
                "fee_structure_id": struct_g2["id"],
                "selected_component_ids": [comp["id"]],
                "installment_frequency": "quarterly",
            },
        },
    )
    assert adm_res.status_code == 201
    student_id = adm_res.json()["student"]["id"]

    # Verify initial fee assignment is Grade 2, ₹40,000
    det_res = client.get(f"/api/v1/admin/students/{student_id}/details", headers=headers)
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert float(det_data["fees"]["net_amount"]) == 40000.0
    assert len(det_data["fees"]["installments"]) == 4

    # 5. Update student to Grade 3 via target_section_id
    update_res = client.patch(
        f"/api/v1/admin/students/{student_id}",
        headers=headers,
        json={"target_section_id": s3a_id},
    )
    assert update_res.status_code == 200

    # 6. Verify student profile and fees are updated in-place to Grade 3 with Need to Pay entry
    det_res_after = client.get(f"/api/v1/admin/students/{student_id}/details", headers=headers)
    assert det_res_after.status_code == 200
    det_after_data = det_res_after.json()
    assert det_after_data["academic_details"]["grade_id"] == g3_id
    assert det_after_data["academic_details"]["section_id"] == s3a_id
    assert float(det_after_data["fees"]["net_amount"]) == 60000.0
    assert len(det_after_data["fees"]["installments"]) == 4
    assert float(det_after_data["fees"]["installments"][0]["amount"]) == 15000.0

    # Verify Need to Pay adjustment entry is present
    adjs = det_after_data["fees"]["adjustments"]
    assert len(adjs) >= 1
    need_to_pay_adj = adjs[0]
    assert need_to_pay_adj["category"] == "additional_charge"
    assert float(need_to_pay_adj["amount"]) == 20000.0
    assert "Need to Pay" in need_to_pay_adj["description"]

    # 7. Downgrade student back to Grade 2 (fee decreases from 60,000 to 40,000)
    downgrade_res = client.patch(
        f"/api/v1/admin/students/{student_id}",
        headers=headers,
        json={"target_section_id": s2a_id},
    )
    assert downgrade_res.status_code == 200

    det_res_down = client.get(f"/api/v1/admin/students/{student_id}/details", headers=headers)
    assert det_res_down.status_code == 200
    det_down_data = det_res_down.json()
    assert det_down_data["academic_details"]["grade_id"] == g2_id
    assert float(det_down_data["fees"]["net_amount"]) == 40000.0

    # Verify Overpaid difference adjustment entry is present
    down_adjs = det_down_data["fees"]["adjustments"]
    assert len(down_adjs) >= 2
    categories = [a["category"] for a in down_adjs]
    assert "additional_charge" in categories
    assert "discount" in categories
    overpaid_adj = next(a for a in down_adjs if a["category"] == "discount")
    assert float(overpaid_adj["amount"]) == 20000.0
    assert "Overpaid Difference" in overpaid_adj["description"]

    # Verify no multiple student records exist
    from app.models.student import Student
    st_count = db.query(Student).filter(Student.first_name == "DevSync").count()
    assert st_count == 1

