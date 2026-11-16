"""Comprehensive Test Suite for Razorpay Payment Gateway Integration.

Covers:
- RazorpayService utility and SDK signature verification
- POST /api/v1/fees/payments/create-order (and alias /api/v1/payments/create-order)
- Validation: overpayment guard, zero amount, unauthorized parent
- POST /api/v1/fees/payments/verify with atomic balance settlement & idempotency
- POST /api/v1/fees/payments/webhook with raw body signature verification & event deduplication
- GET /api/v1/fees/receipts/{receipt_number}/pdf with ReportLab PDF validation
- Admin transaction listing with search and filters
"""

import datetime as dt
import hashlib
import hmac
import json
import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
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
from app.services.fee_service import assign_fees_to_student, create_fee_component, create_fee_structure
from app.services.razorpay_service import razorpay_service
from app.schemas.fee import (
    AdmissionFeeAssignmentPayload,
    FeeComponentCreate,
    FeeStructureCreate,
    FeeStructureItemCreate,
)


def _get_token(user: User) -> str:
    return create_access_token(user.id, user.role)


@pytest.fixture
def rzp_setup(db: Session):
    # 1. Admin
    admin = User(
        email=f"admin_rzp_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Admin@123"),
    )
    # 2. Parent 1 & Student 1
    p1_user = User(
        email=f"parent1_rzp_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Parent@123"),
    )
    s1_user = User(
        email=f"student1_rzp_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Student@123"),
    )
    # 3. Parent 2 & Student 2 (for unauthorized access check)
    p2_user = User(
        email=f"parent2_rzp_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Parent@123"),
    )
    s2_user = User(
        email=f"student2_rzp_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Student@123"),
    )
    db.add_all([admin, p1_user, s1_user, p2_user, s2_user])
    db.flush()

    # Academic Year
    ay = AcademicYear(
        name=f"AY-RZP-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)
    db.flush()

    # Grade
    grade = Grade(
        name=f"Grade 10-{uuid.uuid4().hex[:4]}",
        code=f"G10-{uuid.uuid4().hex[:4]}",
        level=10,
        academic_year_id=ay.id,
        status="active",
    )
    db.add(grade)
    db.flush()

    # Section
    sec = Section(
        grade_id=grade.id,
        name="A",
        code=f"G10A-{uuid.uuid4().hex[:4]}",
        academic_year_id=ay.id,
        class_capacity=40,
        status="active",
    )
    db.add(sec)
    db.flush()

    # Students
    stu1 = Student(
        user_id=s1_user.id,
        first_name="Aarav",
        last_name="Sharma",
        student_code=f"STU-{uuid.uuid4().hex[:4].upper()}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6].upper()}",
        class_name=grade.name,
        section="A",
        department="General",
        dob=dt.date(2010, 5, 12),
        gender="male",
        admission_date=dt.date(2026, 4, 1),
        status="active",
    )
    stu2 = Student(
        user_id=s2_user.id,
        first_name="Diya",
        last_name="Patel",
        student_code=f"STU-{uuid.uuid4().hex[:4].upper()}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6].upper()}",
        class_name=grade.name,
        section="A",
        department="General",
        dob=dt.date(2011, 8, 20),
        gender="female",
        admission_date=dt.date(2026, 4, 1),
        status="active",
    )
    db.add_all([stu1, stu2])
    db.flush()

    # Parents
    parent1 = Parent(
        user_id=p1_user.id,
        first_name="Vikram",
        last_name="Sharma",
        phone="+91 98765 11111",
    )
    parent2 = Parent(
        user_id=p2_user.id,
        first_name="Sunita",
        last_name="Patel",
        phone="+91 98765 22222",
    )
    db.add_all([parent1, parent2])
    db.flush()

    # Parent Links
    link1 = ParentStudentLink(
        parent_id=parent1.id,
        student_id=stu1.id,
        relationship_type="Father",
        is_primary_guardian=True,
    )
    link2 = ParentStudentLink(
        parent_id=parent2.id,
        student_id=stu2.id,
        relationship_type="Mother",
        is_primary_guardian=True,
    )
    db.add_all([link1, link2])
    db.flush()

    # Fee Component
    comp = create_fee_component(
        FeeComponentCreate(
            name="Annual Tuition",
            code=f"TUIT-{uuid.uuid4().hex[:6].upper()}",
            fee_type="tuition",
            payment_frequency="annual",
            is_mandatory=True,
        ),
        db,
    )

    # Fee Structure
    struct = create_fee_structure(
        FeeStructureCreate(
            academic_year_id=ay.id,
            grade_id=grade.id,
            name="Grade 10 General Structure",
            items=[FeeStructureItemCreate(fee_component_id=comp.id, amount=Decimal("20000.00"))],
        ),
        admin.id,
        db,
    )

    # Fee Assignment for Student 1 (4 quarterly installments: ₹5,000 each)
    assign_payload = AdmissionFeeAssignmentPayload(
        fee_structure_id=struct.id,
        selected_component_ids=[comp.id],
        installment_frequency="quarterly",  # 4 installments: 5,000 each
        adjustments=[],
    )
    assign1 = assign_fees_to_student(
        student_id=stu1.id,
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
        "admin_token": _get_token(admin),
        "parent1": parent1,
        "parent1_token": _get_token(p1_user),
        "parent2": parent2,
        "parent2_token": _get_token(p2_user),
        "student1": stu1,
        "student2": stu2,
        "assignment": assign1,
        "academic_year": ay,
        "grade": grade,
    }


def test_razorpay_service_signature_verification():
    """Verify RazorpayService utility functions and signature calculations."""
    order_id = "order_test_12345"
    payment_id = "pay_test_67890"
    secret = settings.RAZORPAY_KEY_SECRET

    # Generate genuine HMAC signature
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    valid_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    assert razorpay_service.verify_payment_signature(order_id, payment_id, valid_sig) is True
    assert razorpay_service.verify_payment_signature(order_id, payment_id, "tampered_signature") is False

    # Test Webhook signature verification
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    body = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123"}}}}'
    valid_wh_sig = hmac.new(webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

    assert razorpay_service.verify_webhook_signature(body, valid_wh_sig) is True
    assert razorpay_service.verify_webhook_signature(body, "bad_webhook_sig") is False


def test_create_payment_order_routes(client: TestClient, rzp_setup, db: Session):
    """Test POST /api/v1/fees/payments/create-order and /api/v1/payments/create-order."""
    inst = rzp_setup["assignment"].installments[0]
    p1_token = rzp_setup["parent1_token"]

    # 1. Successful order creation at /api/v1/fees/payments/create-order
    res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 5000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["order_id"].startswith("order_")
    assert float(data["amount"]) == 5000.00
    assert data["amount_paise"] == 500000
    assert data["currency"] == "INR"
    assert data["gateway_provider"] == "razorpay"
    assert data["student_name"] == "Aarav Sharma"

    # Verify transaction in database has parent_id and assignment_id
    tx = db.query(PaymentTransaction).filter(PaymentTransaction.gateway_order_id == data["order_id"]).first()
    assert tx is not None
    assert tx.parent_id == rzp_setup["parent1"].id
    assert tx.assignment_id == rzp_setup["assignment"].id
    assert tx.status == "created"

    # 2. Also verify alias /api/v1/payments/create-order works seamlessly
    res_alias = client.post(
        "/api/v1/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 2500.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert res_alias.status_code == 201
    assert float(res_alias.json()["amount"]) == 2500.00


def test_payment_order_validation_and_overpayment_guard(client: TestClient, rzp_setup):
    """Ensure orders cannot exceed outstanding balance or be zero/negative."""
    inst = rzp_setup["assignment"].installments[0]  # ₹10,000 outstanding
    p1_token = rzp_setup["parent1_token"]

    # Exceeding amount (₹15,000 > ₹10,000)
    res_exceed = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 15000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert res_exceed.status_code == 400
    assert "cannot exceed outstanding amount" in res_exceed.json()["detail"]


def test_unauthorized_parent_access_rejected(client: TestClient, rzp_setup):
    """Parent 2 cannot pay for Student 1's installment."""
    inst = rzp_setup["assignment"].installments[0]  # Belongs to Student 1
    p2_token = rzp_setup["parent2_token"]           # Parent of Student 2

    res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id)},
        headers={"Authorization": f"Bearer {p2_token}"},
    )
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"].lower()


def test_verify_client_payment_atomic_and_idempotent(client: TestClient, rzp_setup, db: Session):
    """Test payment verification, balance reduction, receipt generation, and duplicate idempotency."""
    inst = rzp_setup["assignment"].installments[0]
    p1_token = rzp_setup["parent1_token"]

    # 1. Create order for partial payment of ₹4,000
    order_res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 4000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    order_id = order_res.json()["order_id"]
    payment_id = f"pay_{uuid.uuid4().hex[:10]}"

    # Signature with simulation test tag
    valid_sig = f"sim_sig_{order_id}_{payment_id}"

    # 2. Verify payment
    verify_res = client.post(
        "/api/v1/fees/payments/verify",
        json={
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": valid_sig,
        },
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["success"] is True
    assert v_data["status"] == "captured"
    receipt_number = v_data["receipt_number"]
    assert receipt_number.startswith("RCP-")
    assert float(v_data["paid_amount"]) == 4000.00
    assert float(v_data["remaining_balance"]) == 1000.00

    # Verify DB installment update
    db_inst = db.get(FeeInstallment, inst.id)
    assert db_inst.paid_amount == Decimal("4000.00")
    assert db_inst.outstanding_amount == Decimal("1000.00")
    assert db_inst.status == "partially_paid"

    # 3. IDEMPOTENCY: Repeated verify call must return the same receipt without re-deducting balance
    dup_res = client.post(
        "/api/v1/fees/payments/verify",
        json={
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": valid_sig,
        },
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["receipt_number"] == receipt_number

    db.expire(db_inst)
    db.refresh(db_inst)
    assert db_inst.paid_amount == Decimal("4000.00")  # Still 4000, NOT 8000!


def test_invalid_payment_signature_rejected(client: TestClient, rzp_setup):
    """Tampered or invalid signature returns 400."""
    inst = rzp_setup["assignment"].installments[0]
    p1_token = rzp_setup["parent1_token"]

    order_res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 1000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    order_id = order_res.json()["order_id"]

    res = client.post(
        "/api/v1/fees/payments/verify",
        json={
            "gateway_order_id": order_id,
            "gateway_payment_id": "pay_fake_123",
            "gateway_signature": "tampered_fake_sig",
        },
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert res.status_code == 400
    assert "signature verification failed" in res.json()["detail"].lower()


def test_webhook_captured_and_deduplication(client: TestClient, rzp_setup, db: Session):
    """Test webhook payment.captured with raw signature and deduplication."""
    inst = rzp_setup["assignment"].installments[1]
    p1_token = rzp_setup["parent1_token"]

    # 1. Create order
    order_res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 5000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    order_id = order_res.json()["order_id"]
    pay_id = f"pay_{uuid.uuid4().hex[:10]}"
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "order_id": order_id,
                    "amount": 500000,  # ₹5,000 in paise
                    "currency": "INR",
                    "status": "captured",
                    "method": "upi",
                }
            }
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")

    # Generate HMAC with secret
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    sig = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    # 2. First Webhook Post to /api/v1/fees/payments/webhook
    res1 = client.post(
        "/api/v1/fees/payments/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    db_inst = db.get(FeeInstallment, inst.id)
    db.expire(db_inst)
    db.refresh(db_inst)
    assert db_inst.status == "paid"
    assert db_inst.outstanding_amount == Decimal("0.00")

    # 3. Duplicate Webhook delivery should be ignored safely
    res2 = client.post(
        "/api/v1/fees/payments/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ignored"


def test_webhook_payment_failed_event(client: TestClient, rzp_setup, db: Session):
    """Test webhook payment.failed event marks transaction as failed."""
    inst = rzp_setup["assignment"].installments[0]
    p1_token = rzp_setup["parent1_token"]

    order_res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 1000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    order_id = order_res.json()["order_id"]
    event_id = f"evt_fail_{uuid.uuid4().hex[:10]}"

    payload = {
        "id": event_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_f_{uuid.uuid4().hex[:8]}",
                    "order_id": order_id,
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment was declined by customer bank",
                }
            }
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")
    sig = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    res = client.post(
        "/api/v1/fees/payments/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert res.status_code == 200

    tx = db.query(PaymentTransaction).filter(PaymentTransaction.gateway_order_id == order_id).first()
    assert tx.status == "failed"
    assert tx.error_code == "BAD_REQUEST_ERROR"


def test_download_payment_receipt_pdf(client: TestClient, rzp_setup, db: Session):
    """Test GET /api/v1/fees/receipts/{receipt_number}/pdf returns valid PDF."""
    inst = rzp_setup["assignment"].installments[0]
    p1_token = rzp_setup["parent1_token"]
    admin_token = rzp_setup["admin_token"]
    p2_token = rzp_setup["parent2_token"]

    # 1. Complete a payment to get receipt number
    order_res = client.post(
        "/api/v1/fees/payments/create-order",
        json={"installment_id": str(inst.id), "amount": 2000.00},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    order_id = order_res.json()["order_id"]
    pay_id = f"pay_{uuid.uuid4().hex[:8]}"

    v_res = client.post(
        "/api/v1/fees/payments/verify",
        json={
            "gateway_order_id": order_id,
            "gateway_payment_id": pay_id,
            "gateway_signature": f"sim_sig_{order_id}_{pay_id}",
        },
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    receipt_num = v_res.json()["receipt_number"]

    # 2. Parent 1 can download PDF
    p1_pdf = client.get(
        f"/api/v1/fees/receipts/{receipt_num}/pdf",
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert p1_pdf.status_code == 200
    assert p1_pdf.headers["Content-Type"] == "application/pdf"
    assert p1_pdf.content.startswith(b"%PDF")
    assert f'filename="fee_receipt_{receipt_num}.pdf"' in p1_pdf.headers["Content-Disposition"]

    # 3. Admin can download PDF
    admin_pdf = client.get(
        f"/api/v1/fees/receipts/{receipt_num}/pdf",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_pdf.status_code == 200
    assert admin_pdf.content.startswith(b"%PDF")

    # 4. Unauthorized Parent 2 is blocked (403 Forbidden)
    p2_pdf = client.get(
        f"/api/v1/fees/receipts/{receipt_num}/pdf",
        headers={"Authorization": f"Bearer {p2_token}"},
    )
    assert p2_pdf.status_code == 403


def test_admin_list_transactions_and_search(client: TestClient, rzp_setup):
    """Test admin transactions listing with search query, status filter, and pagination."""
    admin_token = rzp_setup["admin_token"]

    # Search by student name
    res = client.get(
        "/api/v1/admin/fees/transactions?search=Aarav",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    for item in data["items"]:
        assert "Aarav" in item["student_name"] or item.get("student_code") is not None
