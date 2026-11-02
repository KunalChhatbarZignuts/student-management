"""
Seed realistic dummy data for Fee Management:
- Fee Components catalog
- Grade-wise Fee Structures for Academic Year 2026-2027
- Student Fee Assignments for existing enrolled students with adjustments and installment schedules
"""

import datetime as dt
import uuid
from decimal import Decimal, ROUND_HALF_UP
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.academic_structure import AcademicYear, Grade, StudentEnrollment
from app.models.fee import (
    FeeComponent,
    FeeInstallment,
    FeeStructure,
    FeeStructureItem,
    StudentFeeAdjustment,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.models.student import Student
from app.models.user import User


def round_curr(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def seed_fee_data():
    engine = sa.create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        print("Starting Fee Management dummy data seeding...")

        # 1. Fetch current active Academic Year
        ay = db.execute(
            sa.select(AcademicYear).where(AcademicYear.name == "2026-2027")
        ).scalar_one_or_none()
        if not ay:
            ay = db.execute(
                sa.select(AcademicYear).where(AcademicYear.is_current == True)
            ).scalars().first()
        if not ay:
            print("ERROR: No active academic year found!")
            return

        print(f"Using Academic Year: {ay.name} ({ay.id})")

        # 2. Get Admin user for created_by
        admin_user = db.execute(
            sa.select(User).where(User.role.in_(["super_admin", "admin"]))
        ).scalars().first()
        admin_id = admin_user.id if admin_user else None

        # 3. Create Fee Components
        components_data = [
            {
                "name": "Base Tuition Fee",
                "code": "TUITION",
                "description": "Standard core academic curriculum tuition fee",
                "fee_type": "tuition",
                "payment_frequency": "annual",
                "is_mandatory": True,
                "is_recurring": True,
            },
            {
                "name": "Admission & Registration Fee",
                "code": "ADMISSION",
                "description": "One-time admission administrative processing fee",
                "fee_type": "admission",
                "payment_frequency": "one_time",
                "is_mandatory": True,
                "is_recurring": False,
            },
            {
                "name": "Examination & Assessment Fee",
                "code": "EXAM",
                "description": "Term examinations, evaluation tests, and certification",
                "fee_type": "exam",
                "payment_frequency": "annual",
                "is_mandatory": True,
                "is_recurring": True,
            },
            {
                "name": "Sports & Co-Curricular Activity Fee",
                "code": "ACTIVITY",
                "description": "Athletics, clubs, sports facilities, and cultural events",
                "fee_type": "activity",
                "payment_frequency": "annual",
                "is_mandatory": True,
                "is_recurring": True,
            },
            {
                "name": "School Bus Transport Fee",
                "code": "TRANSPORT",
                "description": "Optional door-to-door or stop bus commute service",
                "fee_type": "transport",
                "payment_frequency": "annual",
                "is_mandatory": False,
                "is_recurring": True,
            },
            {
                "name": "Science & Computer Lab Access Fee",
                "code": "LAB",
                "description": "Practical equipment, robotics lab, and computer science workshops",
                "fee_type": "other",
                "payment_frequency": "annual",
                "is_mandatory": False,
                "is_recurring": True,
            },
            {
                "name": "Digital & Physical Library Subscription",
                "code": "LIBRARY",
                "description": "Access to international journals, e-books, and study material",
                "fee_type": "other",
                "payment_frequency": "annual",
                "is_mandatory": False,
                "is_recurring": True,
            },
        ]

        component_map: dict[str, FeeComponent] = {}
        for c_data in components_data:
            existing = db.execute(
                sa.select(FeeComponent).where(FeeComponent.code == c_data["code"])
            ).scalar_one_or_none()
            if not existing:
                comp = FeeComponent(
                    name=c_data["name"],
                    code=c_data["code"],
                    description=c_data["description"],
                    fee_type=c_data["fee_type"],
                    payment_frequency=c_data["payment_frequency"],
                    is_mandatory=c_data["is_mandatory"],
                    is_recurring=c_data["is_recurring"],
                    status="active",
                )
                db.add(comp)
                db.flush()
                component_map[c_data["code"]] = comp
            else:
                component_map[c_data["code"]] = existing

        print(f"Fee Components verified/created: {len(component_map)}")

        # 4. Create Grade-wise Fee Structures
        # Fetch grades belonging to this Academic Year
        grades = db.execute(
            sa.select(Grade).where(Grade.academic_year_id == ay.id, Grade.status == "active")
        ).scalars().all()

        grade_map = {g.name: g for g in grades}

        structures_spec = [
            {
                "grade_name": "Nursery",
                "name": "Nursery Annual Fee Schedule 2026-27",
                "items": [
                    ("TUITION", Decimal("15000.00"), True),
                    ("ADMISSION", Decimal("4000.00"), True),
                    ("ACTIVITY", Decimal("2000.00"), True),
                    ("TRANSPORT", Decimal("3000.00"), False),
                ],
            },
            {
                "grade_name": "Grade 1",
                "name": "Grade 1 Standard Fee Structure 2026-27",
                "items": [
                    ("TUITION", Decimal("20000.00"), True),
                    ("ADMISSION", Decimal("5000.00"), True),
                    ("EXAM", Decimal("1500.00"), True),
                    ("ACTIVITY", Decimal("2500.00"), True),
                    ("TRANSPORT", Decimal("3500.00"), False),
                    ("LIBRARY", Decimal("1000.00"), False),
                ],
            },
            {
                "grade_name": "Grade 2",
                "name": "Grade 2 Standard Fee Structure 2026-27",
                "items": [
                    ("TUITION", Decimal("22000.00"), True),
                    ("ADMISSION", Decimal("5000.00"), True),
                    ("EXAM", Decimal("1500.00"), True),
                    ("ACTIVITY", Decimal("2500.00"), True),
                    ("TRANSPORT", Decimal("3500.00"), False),
                    ("LIBRARY", Decimal("1000.00"), False),
                ],
            },
            {
                "grade_name": "Grade 3",
                "name": "Grade 3 Standard Fee Structure 2026-27",
                "items": [
                    ("TUITION", Decimal("24000.00"), True),
                    ("ADMISSION", Decimal("5000.00"), True),
                    ("EXAM", Decimal("2000.00"), True),
                    ("ACTIVITY", Decimal("2500.00"), True),
                    ("TRANSPORT", Decimal("3500.00"), False),
                    ("LAB", Decimal("2000.00"), False),
                ],
            },
            {
                "grade_name": "Grade 5",
                "name": "Grade 5 Standard Fee Structure 2026-27",
                "items": [
                    ("TUITION", Decimal("28000.00"), True),
                    ("ADMISSION", Decimal("5000.00"), True),
                    ("EXAM", Decimal("2000.00"), True),
                    ("ACTIVITY", Decimal("3000.00"), True),
                    ("TRANSPORT", Decimal("4000.00"), False),
                    ("LAB", Decimal("2500.00"), False),
                    ("LIBRARY", Decimal("1500.00"), False),
                ],
            },
            {
                "grade_name": "Grade 10",
                "name": "Grade 10 Board Prep Fee Structure 2026-27",
                "items": [
                    ("TUITION", Decimal("35000.00"), True),
                    ("ADMISSION", Decimal("5000.00"), True),
                    ("EXAM", Decimal("3000.00"), True),
                    ("ACTIVITY", Decimal("3000.00"), True),
                    ("LAB", Decimal("4000.00"), True),
                    ("TRANSPORT", Decimal("4500.00"), False),
                    ("LIBRARY", Decimal("2000.00"), False),
                ],
            },
            {
                "grade_name": "Grade 12",
                "name": "Grade 12 Senior Secondary Fee Plan 2026-27",
                "items": [
                    ("TUITION", Decimal("42000.00"), True),
                    ("ADMISSION", Decimal("5000.00"), True),
                    ("EXAM", Decimal("3500.00"), True),
                    ("ACTIVITY", Decimal("3500.00"), True),
                    ("LAB", Decimal("5000.00"), True),
                    ("TRANSPORT", Decimal("5000.00"), False),
                    ("LIBRARY", Decimal("2500.00"), False),
                ],
            },
        ]

        structure_by_grade: dict[uuid.UUID, FeeStructure] = {}

        for s_spec in structures_spec:
            grade_obj = grade_map.get(s_spec["grade_name"])
            if not grade_obj:
                continue

            existing_str = db.execute(
                sa.select(FeeStructure).where(
                    FeeStructure.grade_id == grade_obj.id,
                    FeeStructure.academic_year_id == ay.id,
                    FeeStructure.status == "active",
                )
            ).scalars().first()

            if not existing_str:
                # Calculate mandatory sum
                mand_sum = sum(amt for code, amt, is_mand in s_spec["items"] if is_mand)
                new_str = FeeStructure(
                    academic_year_id=ay.id,
                    grade_id=grade_obj.id,
                    name=s_spec["name"],
                    description=f"Standard approved fee schedule for {grade_obj.name}",
                    total_amount=round_curr(mand_sum),
                    currency="INR",
                    status="active",
                    effective_date=dt.date(2026, 4, 1),
                    created_by_user_id=admin_id,
                )
                db.add(new_str)
                db.flush()

                for idx, (c_code, amt, is_mand) in enumerate(s_spec["items"]):
                    comp_obj = component_map[c_code]
                    s_item = FeeStructureItem(
                        fee_structure_id=new_str.id,
                        fee_component_id=comp_obj.id,
                        amount=round_curr(amt),
                        payment_frequency=comp_obj.payment_frequency,
                        is_mandatory=is_mand,
                        display_order=idx,
                    )
                    db.add(s_item)

                db.flush()
                structure_by_grade[grade_obj.id] = new_str
                print(f"Created Fee Structure: {new_str.name} (Mandatory total: ₹{mand_sum})")
            else:
                structure_by_grade[grade_obj.id] = existing_str

        # 5. Create Student Fee Assignments for Enrolled Students
        enrollments = db.execute(
            sa.select(StudentEnrollment).where(
                StudentEnrollment.academic_year_id == ay.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalars().all()

        print(f"Found {len(enrollments)} active student enrollments for {ay.name}")

        assignments_created = 0

        for idx, enr in enumerate(enrollments):
            # Check if student already has a fee assignment
            existing_assign = db.execute(
                sa.select(StudentFeeAssignment).where(
                    StudentFeeAssignment.student_id == enr.student_id,
                    StudentFeeAssignment.academic_year_id == ay.id,
                )
            ).scalars().first()

            if existing_assign:
                continue

            struct = structure_by_grade.get(enr.grade_id)
            if not struct:
                continue

            # Diversity in fee setup:
            # - Student 0, 3, 6: Takes Transport
            # - Student 1, 4: Has 15% Scholarship Concession
            # - Student 2, 5: Has Sibling Discount ₹2,000
            # - Student 7: Has Robotics / Lab Kit additional charge ₹1,000
            include_transport = (idx % 3 == 0)
            has_scholarship = (idx % 4 == 1)
            has_sibling = (idx % 4 == 2)
            has_extra_kit = (idx % 5 == 3)

            base_amt = Decimal("0.00")
            selected_items = []
            for item in struct.items:
                sel = item.is_mandatory or (include_transport and item.component.code == "TRANSPORT")
                if sel:
                    base_amt += item.amount
                selected_items.append((item, sel))

            base_amt = round_curr(base_amt)

            # Adjustments
            adjustments_to_add = []
            total_discount = Decimal("0.00")
            total_additional = Decimal("0.00")

            if has_scholarship:
                rate = Decimal("15.00")
                amt = round_curr(base_amt * Decimal("0.15"))
                total_discount += amt
                adjustments_to_add.append({
                    "type": "CONCESSION_SCHOLARSHIP",
                    "cat": "concession",
                    "desc": "15% Merit Academic Scholarship",
                    "calc": "percentage",
                    "rate": rate,
                    "amount": amt,
                })

            if has_sibling:
                amt = Decimal("2000.00")
                total_discount += amt
                adjustments_to_add.append({
                    "type": "DISCOUNT_FIXED",
                    "cat": "discount",
                    "desc": "Annual Sibling Enrolled Discount",
                    "calc": "fixed",
                    "rate": None,
                    "amount": amt,
                })

            if has_extra_kit:
                amt = Decimal("1500.00")
                total_additional += amt
                adjustments_to_add.append({
                    "type": "ADDITIONAL_CHARGE",
                    "cat": "additional_charge",
                    "desc": "Advanced Robotics & STEM Competition Kit",
                    "calc": "fixed",
                    "rate": None,
                    "amount": amt,
                })

            final_payable = round_curr(base_amt - total_discount + total_additional)

            # Installment frequency
            freq = "quarterly" if idx % 2 == 0 else "half_yearly"

            assignment = StudentFeeAssignment(
                student_id=enr.student_id,
                academic_year_id=ay.id,
                grade_id=enr.grade_id,
                fee_structure_id=struct.id,
                base_amount=base_amt,
                total_discount=total_discount,
                total_additional=total_additional,
                final_payable_amount=final_payable,
                currency="INR",
                installment_frequency=freq,
                status="active",
                assigned_date=dt.date(2026, 4, 1),
                notes="Standard admission fee enrollment",
                created_by_user_id=admin_id,
            )
            db.add(assignment)
            db.flush()

            # Snapshot items
            for item, is_sel in selected_items:
                snap = StudentFeeAssignmentItem(
                    assignment_id=assignment.id,
                    fee_component_id=item.fee_component_id,
                    component_name=item.component.name if item.component else "Fee Component",
                    amount=item.amount,
                    payment_frequency=item.payment_frequency,
                    is_mandatory=item.is_mandatory,
                    is_selected=is_sel,
                )
                db.add(snap)

            # Adjustments
            for a_info in adjustments_to_add:
                adj_rec = StudentFeeAdjustment(
                    assignment_id=assignment.id,
                    adjustment_type=a_info["type"],
                    category=a_info["cat"],
                    description=a_info["desc"],
                    calculation_type=a_info["calc"],
                    rate=a_info["rate"],
                    amount=a_info["amount"],
                    created_by_user_id=admin_id,
                )
                db.add(adj_rec)

            # Installments (generate 4 quarters or 2 terms)
            num_insts = 4 if freq == "quarterly" else 2
            inst_amount = round_curr(final_payable / Decimal(num_insts))
            rem = final_payable - (inst_amount * Decimal(num_insts - 1))

            start_date = dt.date(2026, 4, 10)
            for inst_no in range(1, num_insts + 1):
                cur_amt = rem if inst_no == num_insts else inst_amount
                d_date = start_date + dt.timedelta(days=(inst_no - 1) * (90 if freq == "quarterly" else 180))

                # Some are paid, some pending
                if inst_no == 1:
                    status = "paid"
                    paid_amt = cur_amt
                    out_amt = Decimal("0.00")
                elif inst_no == 2 and idx % 2 == 1:
                    status = "paid"
                    paid_amt = cur_amt
                    out_amt = Decimal("0.00")
                else:
                    status = "pending"
                    paid_amt = Decimal("0.00")
                    out_amt = cur_amt

                inst_name = f"Quarter {inst_no}" if freq == "quarterly" else f"Term {inst_no}"
                inst_obj = FeeInstallment(
                    assignment_id=assignment.id,
                    installment_number=inst_no,
                    installment_name=inst_name,
                    due_date=d_date,
                    amount=cur_amt,
                    paid_amount=paid_amt,
                    outstanding_amount=out_amt,
                    status=status,
                )
                db.add(inst_obj)

            assignments_created += 1

        db.commit()
        print(f"Successfully created {assignments_created} student fee assignments with item snapshots and installment schedules!")


if __name__ == "__main__":
    seed_fee_data()

