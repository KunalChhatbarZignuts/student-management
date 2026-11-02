"""create_fees_management_tables

Revision ID: ea6d568eac6f
Revises: dc0e506546fd
Create Date: 2026-11-02 16:37:22.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea6d568eac6f'
down_revision: Union[str, Sequence[str], None] = 'dc0e506546fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. fee_components table
    op.create_table(
        'fee_components',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('fee_type', sa.String(50), nullable=False, server_default='tuition'),
        sa.Column('payment_frequency', sa.String(30), nullable=False, server_default='annual'),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('code', name='uq_fee_components_code'),
    )
    op.create_index('ix_fee_components_code', 'fee_components', ['code'])
    op.create_index('ix_fee_components_status', 'fee_components', ['status'])

    # 2. fee_structures table
    op.create_table(
        'fee_structures',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('academic_year_id', sa.Uuid(), sa.ForeignKey('academic_years.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('grade_id', sa.Uuid(), sa.ForeignKey('grades.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.Column('created_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_fee_structures_year_grade', 'fee_structures', ['academic_year_id', 'grade_id'])
    op.create_index('ix_fee_structures_status', 'fee_structures', ['status'])

    # 3. fee_structure_items table
    op.create_table(
        'fee_structure_items',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('fee_structure_id', sa.Uuid(), sa.ForeignKey('fee_structures.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fee_component_id', sa.Uuid(), sa.ForeignKey('fee_components.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('payment_frequency', sa.String(30), nullable=False, server_default='annual'),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('fee_structure_id', 'fee_component_id', name='uq_structure_component'),
    )
    op.create_index('ix_fee_structure_items_structure', 'fee_structure_items', ['fee_structure_id'])

    # 4. student_fee_assignments table
    op.create_table(
        'student_fee_assignments',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('student_id', sa.Uuid(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('academic_year_id', sa.Uuid(), sa.ForeignKey('academic_years.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('grade_id', sa.Uuid(), sa.ForeignKey('grades.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('fee_structure_id', sa.Uuid(), sa.ForeignKey('fee_structures.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('admission_id', sa.Uuid(), sa.ForeignKey('admissions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('base_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('total_discount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('total_additional', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('final_payable_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='INR'),
        sa.Column('installment_frequency', sa.String(30), nullable=False, server_default='annual'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('assigned_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_student_fee_assignments_student', 'student_fee_assignments', ['student_id'])
    op.create_index('ix_student_fee_assignments_year', 'student_fee_assignments', ['academic_year_id'])
    op.create_index('ix_student_fee_assignments_grade', 'student_fee_assignments', ['grade_id'])

    # 5. student_fee_assignment_items table (historical item snapshots)
    op.create_table(
        'student_fee_assignment_items',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('assignment_id', sa.Uuid(), sa.ForeignKey('student_fee_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fee_component_id', sa.Uuid(), sa.ForeignKey('fee_components.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('component_name', sa.String(100), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('payment_frequency', sa.String(30), nullable=False, server_default='annual'),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_selected', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_assignment_items_assignment', 'student_fee_assignment_items', ['assignment_id'])

    # 6. student_fee_adjustments table
    op.create_table(
        'student_fee_adjustments',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('assignment_id', sa.Uuid(), sa.ForeignKey('student_fee_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('adjustment_type', sa.String(50), nullable=False),
        sa.Column('category', sa.String(30), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('calculation_type', sa.String(20), nullable=False, server_default='fixed'),
        sa.Column('rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('created_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_adjustments_assignment', 'student_fee_adjustments', ['assignment_id'])

    # 7. fee_installments table
    op.create_table(
        'fee_installments',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('assignment_id', sa.Uuid(), sa.ForeignKey('student_fee_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('installment_number', sa.Integer(), nullable=False),
        sa.Column('installment_name', sa.String(100), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('paid_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('outstanding_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_fee_installments_assignment', 'fee_installments', ['assignment_id'])
    op.create_index('ix_fee_installments_status', 'fee_installments', ['status'])
    op.create_index('ix_fee_installments_due_date', 'fee_installments', ['due_date'])


def downgrade() -> None:
    op.drop_table('fee_installments')
    op.drop_table('student_fee_adjustments')
    op.drop_table('student_fee_assignment_items')
    op.drop_table('student_fee_assignments')
    op.drop_table('fee_structure_items')
    op.drop_table('fee_structures')
    op.drop_table('fee_components')
