import datetime as dt
import json
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
    FeePayment,
    FeeStructure,
    FeeStructureItem,
    PaymentTransaction,
    PaymentWebhookEvent,
    StudentFeeAssignment,
)
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.services.fee_service import (
    assign_fees_to_student,
    create_fee_component,
    create_fee_structure,
)
from app.schemas.fee import (
    AdmissionFeeAssignmentPayload,
    FeeComponentCreate,
    FeeStructureCreate,
    FeeStructureItemCreate,
    PaymentOrderCreateRequest,
    PaymentVerifyRequest,
    RecordOfflinePaymentRequest,
    StudentFeeAdjustmentCreate,
)


def _token(user: User) -> str:
    return create_access_token(user.id, user.role)


@pytest.fixture
def payment_fixture(db: Session):
    # 1. Admin
    admin = User(
        email=f"admin_pay_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Admin@123"),
    )
    # 2. Student User & Student Profile
    student_user = User(
        email=f"student_pay_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Student@123"),
    )
    db.add_all([admin, student_user])
    db.flush()

    student = Student(
        user_id=student_user.id,
        student_code=f"STU-2026-{uuid.uuid4().hex[:4].upper()}",
        enrollment_number=f"ENR-2026-{uuid.uuid4().hex[:4].upper()}",
        first_name="Rohan",
        last_name="Verma",
        dob=dt.date(2010, 5, 12),
        gender="male",
        class_name="Grade 5",
        section="A",
        department="General",
        admission_date=dt.date(2026, 4, 1),
        status="active",
    )
    # 3. Parent User & Parent Profile
    parent_user = User(
        email=f"parent_pay_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Parent@123"),
    )
    db.add_all([student, parent_user])
    db.flush()

    parent = Parent(
        user_id=parent_user.id,
        first_name="Sanjay",
        last_name="Verma",
        phone="+919876543210",
    )
    db.add(parent)
    db.flush()

    link = ParentStudentLink(
        parent_id=parent.id,
        student_id=student.id,
        relationship_type="Father",
        is_primary_guardian=True,
    )
    db.add(link)

    # 4. Academic Year & Grade
    ay = AcademicYear(
        name=f"AY-PAY-{uuid.uuid4().hex[:4]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)
    db.flush()

    grade = Grade(
        name="Grade 5",
        code=f"G5-{uuid.uuid4().hex[:4]}",
        level=5,
        academic_year_id=ay.id,
        status="active",
    )
    db.add(grade)
    db.flush()

    # 5. Component & Structure
    comp = create_fee_component(
        FeeComponentCreate(
            name="Tuition Fee",
            code=f"TUIT-{uuid.uuid4().hex[:4]}",
            fee_type="tuition",
            payment_frequency="annual",
            is_mandatory=True,
            status="active",
        ),
        db,
    )

    struct = create_fee_structure(
        FeeStructureCreate(
            academic_year_id=ay.id,
            grade_id=grade.id,
            name="Grade 5 Standard Plan",
            currency="INR",
            items=[
                FeeStructureItemCreate(
                    fee_component_id=comp.id,
                    amount=Decimal("30000.00"),
                    payment_frequency="annual",
                    is_mandatory=True,
                )
            ],
        ),
        actor_user_id=admin.id,
        db=db,
    )

    # 6. Assign fee with 3 installments (quarterly)
    assign_payload = AdmissionFeeAssignmentPayload(
        fee_structure_id=struct.id,
        selected_component_ids=[comp.id],
        installment_frequency="quarterly",  # 4 installments: 7500 each
        adjustments=[],
    )
    assignment = assign_fees_to_student(
        student_id=student.id,
        academic_year_id=ay.id,
        grade_id=grade.id,
        payload=assign_payload,
        admission_id=None,
        actor_user_id=admin.id,
        assigned_date=dt.date.today(),
        db=db,
    )
    db.commit()

    return {
        "admin": admin,
        "student": student,
        "student_user": student_user,
        "parent_user": parent_user,
        "admin_token": _token(admin),
        "student_token": _token(student_user),
        "parent_token": _token(parent_user),
        "assignment": assignment,
    }


def test_create_payment_order_and_overpayment_guard(client: TestClient, payment_fixture, db: Session):
    assignment = payment_fixture["assignment"]
    student_token = payment_fixture["student_token"]
    parent_token = payment_fixture["parent_token"]
    inst_1 = assignment.installments[0]

    # 1. Student access is forbidden per Part A requirement
    stu_resp = client.post(
        "/api/v1/payments/create-order",
        json={"installment_id": str(inst_1.id)},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert stu_resp.status_code == 403
    assert "Students are not authorized" in stu_resp.json()["detail"]

    # 2. Parent successful order creation
    resp = client.post(
        "/api/v1/payments/create-order",
        json={"installment_id": str(inst_1.id)},
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["order_id"].startswith("order_")
    assert Decimal(str(data["amount"])) == inst_1.amount
    assert data["amount_paise"] == int(inst_1.amount * 100)
    assert data["currency"] == "INR"

    # 3. Overpayment rejection
    excess_amt = inst_1.amount + Decimal("1000.00")
    bad_resp = client.post(
        "/api/v1/payments/create-order",
        json={"installment_id": str(inst_1.id), "amount": float(excess_amt)},
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert bad_resp.status_code == 400
    assert "cannot exceed outstanding amount" in bad_resp.json()["detail"]


def test_verify_client_payment(client: TestClient, payment_fixture, db: Session):
    inst_1 = payment_fixture["assignment"].installments[0]
    parent_token = payment_fixture["parent_token"]

    # Create order first via authorized parent
    order_res = client.post(
        "/api/v1/payments/create-order",
        json={"installment_id": str(inst_1.id)},
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["order_id"]

    # Verify signature
    verify_res = client.post(
        "/api/v1/payments/verify",
        json={
            "gateway_order_id": order_id,
            "gateway_payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "gateway_signature": "sim_sig_valid",
        },
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["success"] is True
    assert v_data["status"] == "captured"
    assert v_data["receipt_number"].startswith("RCP-")


def test_webhook_payment_captured_and_idempotency(client: TestClient, payment_fixture, db: Session):
    inst_2 = payment_fixture["assignment"].installments[1]
    token = payment_fixture["parent_token"]

    # 1. Create order
    order_res = client.post(
        "/api/v1/payments/create-order",
        json={"installment_id": str(inst_2.id)},
        headers={"Authorization": f"Bearer {token}"},
    )
    order_id = order_res.json()["order_id"]
    pay_id = f"pay_{uuid.uuid4().hex[:10]}"
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    webhook_payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "order_id": order_id,
                    "amount": int(inst_2.amount * 100),
                    "currency": "INR",
                    "status": "captured",
                    "method": "upi",
                }
            }
        },
    }

    raw_body = json.dumps(webhook_payload).encode("utf-8")

    # 2. First Webhook delivery
    resp1 = client.post(
        "/api/v1/webhooks/payments/razorpay",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "sim_webhook_sig_test"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "success"

    # Verify installment updated
    db_inst = db.get(FeeInstallment, inst_2.id)
    assert db_inst.status == "paid"
    assert db_inst.outstanding_amount == Decimal("0.00")
    assert db_inst.paid_amount == inst_2.amount

    # 3. Duplicate Webhook delivery (Idempotency test)
    resp2 = client.post(
        "/api/v1/webhooks/payments/razorpay",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "sim_webhook_sig_test"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ignored"

    # Verify no double payment created
    payments_count = (
        db.query(FeePayment).filter(FeePayment.installment_id == inst_2.id).count()
    )
    assert payments_count == 1


def test_admin_record_offline_payment(client: TestClient, payment_fixture, db: Session):
    admin_token = payment_fixture["admin_token"]
    inst_3 = payment_fixture["assignment"].installments[2]

    # Admin records offline cash payment
    resp = client.post(
        f"/api/v1/admin/fees/installments/{inst_3.id}/record-offline-payment",
        json={
            "amount": float(inst_3.amount),
            "payment_method": "cash",
            "reference_note": "Paid cash at accounts counter",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["receipt_number"].startswith("RCP-")
    assert data["payment_method"] == "cash"
    assert Decimal(str(data["amount"])) == inst_3.amount

    # Verify receipt detail endpoint
    rcp_res = client.get(
        f"/api/v1/fees/receipts/{data['receipt_number']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rcp_res.status_code == 200
    assert rcp_res.json()["receipt_number"] == data["receipt_number"]


def test_admin_apply_concession_and_rebalance(client: TestClient, payment_fixture, db: Session):
    admin_token = payment_fixture["admin_token"]
    assignment_id = payment_fixture["assignment"].id

    # Apply 10% merit scholarship discount
    adj_resp = client.post(
        f"/api/v1/admin/fees/assignments/{assignment_id}/adjustments",
        json={
            "adjustment_type": "merit_scholarship",
            "category": "concession",
            "description": "10% Merit Academic Scholarship",
            "calculation_type": "percentage",
            "rate": 10.0,
            "amount": 0.0,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert adj_resp.status_code == 201
    data = adj_resp.json()
    assert Decimal(str(data["total_discount"])) == Decimal("3000.00")
    assert Decimal(str(data["final_payable_amount"])) == Decimal("27000.00")


def test_student_and_parent_portal_schedules(client: TestClient, payment_fixture, db: Session):
    student_token = payment_fixture["student_token"]
    parent_token = payment_fixture["parent_token"]
    student_id = payment_fixture["student"].id

    # 1. Student access is restricted (403 Forbidden) per school policy
    st_res = client.get(
        "/api/v1/student/fees/my-schedule",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert st_res.status_code == 403
    assert "Students are not authorized" in st_res.json()["detail"]

    # 2. Parent views child schedule (200 OK)
    pt_res = client.get(
        f"/api/v1/parent/fees/child/{student_id}",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert pt_res.status_code == 200
    pt_data = pt_res.json()
    assert pt_data["student_id"] == str(student_id)
    assert len(pt_data["installments"]) > 0


def test_admin_list_transactions_and_webhooks(client: TestClient, payment_fixture, db: Session):
    admin_token = payment_fixture["admin_token"]

    tx_res = client.get(
        "/api/v1/admin/fees/transactions",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert tx_res.status_code == 200
    assert "items" in tx_res.json()

    wh_res = client.get(
        "/api/v1/admin/fees/webhooks",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert wh_res.status_code == 200
    assert "items" in wh_res.json()
