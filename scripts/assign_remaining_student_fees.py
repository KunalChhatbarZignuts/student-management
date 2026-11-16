#!/usr/bin/env python3
"""
Assign active 2026-2027 fee structures to all students who currently do not have a fee assignment.
Ensures every student in the school has:
- StudentFeeAssignment record
- StudentFeeAssignmentItem snapshots
- Quarterly/Term-wise FeeInstallments with realistic due dates
"""

import sys
import uuid
import datetime as dt
from decimal import Decimal, ROUND_HALF_UP
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.academic_structure import Grade, AcademicYear
from app.models.fee import (
    FeeStructure,
    FeeStructureItem,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
    FeeInstallment,
)
from app.models.student import Student
from app.models.user import User

def round_curr(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def run():
    db = SessionLocal()
    try:
        ay = db.execute(sa.select(AcademicYear).where(AcademicYear.is_current == True)).scalars().first()
        if not ay:
            print("Error: No current active academic year found!")
            return

        admin_user = db.execute(sa.select(User).where(User.role.in_(["super_admin", "admin"]))).scalars().first()
        admin_id = admin_user.id if admin_user else None

        grades = db.query(Grade).all()
        grade_map = {g.name.lower().strip(): g for g in grades}

        structures = db.query(FeeStructure).filter(FeeStructure.academic_year_id == ay.id).all()
        struct_by_grade = {s.grade_id: s for s in structures}

        default_grade = grade_map.get("grade 10")
        default_struct = struct_by_grade.get(default_grade.id) if default_grade else list(structures)[0]

        all_students = db.query(Student).all()
        assigned_student_ids = {a.student_id for a in db.query(StudentFeeAssignment).all()}
        unassigned = [s for s in all_students if s.id not in assigned_student_ids]

        print(f"Assigning fees for {len(unassigned)} unassigned students in AY {ay.name}...")

        count = 0
        for s in unassigned:
            cls_clean = (s.class_name or "").lower().strip()
            if cls_clean == "1":
                cls_clean = "grade 1"

            matched_grade = grade_map.get(cls_clean, default_grade)
            matched_struct = struct_by_grade.get(matched_grade.id, default_struct)

            # Sum mandatory items
            mand_items = [it for it in matched_struct.items if it.is_mandatory]
            if not mand_items:
                mand_items = list(matched_struct.items)

            base_amt = round_curr(sum(Decimal(str(it.amount)) for it in mand_items))
            final_amt = base_amt

            assignment = StudentFeeAssignment(
                student_id=s.id,
                academic_year_id=ay.id,
                grade_id=matched_grade.id,
                fee_structure_id=matched_struct.id,
                base_amount=base_amt,
                total_discount=Decimal("0.00"),
                total_additional=Decimal("0.00"),
                final_payable_amount=final_amt,
                currency="INR",
                installment_frequency="quarterly",
                status="active",
                assigned_date=dt.date(2026, 4, 1),
                notes="Standard institutional enrollment fee assignment",
                created_by_user_id=admin_id,
            )
            db.add(assignment)
            db.flush()

            # Snapshot items
            for it in mand_items:
                snap = StudentFeeAssignmentItem(
                    assignment_id=assignment.id,
                    fee_component_id=it.fee_component_id,
                    component_name=it.component.name if it.component else "Fee Component",
                    amount=it.amount,
                    payment_frequency=it.payment_frequency,
                    is_mandatory=it.is_mandatory,
                    is_selected=True,
                )
                db.add(snap)

            # Create 4 Quarterly Installments
            q_dates = [
                (1, "Quarter 1", dt.date(2026, 4, 10)),
                (2, "Quarter 2", dt.date(2026, 7, 10)),
                (3, "Quarter 3", dt.date(2026, 10, 10)),
                (4, "Quarter 4", dt.date(2027, 1, 10)),
            ]
            q_part = round_curr(final_amt / Decimal("4"))
            q_rem = final_amt - (q_part * Decimal("3"))

            for num, name, due_d in q_dates:
                inst_amt = q_part if num < 4 else q_rem
                inst = FeeInstallment(
                    assignment_id=assignment.id,
                    installment_number=num,
                    installment_name=name,
                    due_date=due_d,
                    amount=inst_amt,
                    paid_amount=Decimal("0.00"),
                    outstanding_amount=inst_amt,
                    status="pending",
                )
                db.add(inst)

            count += 1

        db.commit()
        print(f"Successfully created fee assignments for {count} students!")

        total_assignments = db.query(StudentFeeAssignment).count()
        print(f"Total students now with fee assignments: {total_assignments}")
    finally:
        db.close()

if __name__ == "__main__":
    run()

