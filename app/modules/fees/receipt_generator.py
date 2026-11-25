import datetime as dt
from decimal import Decimal
from io import BytesIO
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.modules.fees.pos_schemas import POSPaymentReceiptResponse


def generate_fee_receipt_pdf(data: POSPaymentReceiptResponse) -> bytes:
    """Generate a crisp, official school fee payment receipt in PDF format using ReportLab."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    school_title_style = ParagraphStyle(
        "SchoolTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=1,  # Center
        textColor=colors.HexColor("#0f172a"),
    )

    school_sub_style = ParagraphStyle(
        "SchoolSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor("#475569"),
    )

    receipt_banner_style = ParagraphStyle(
        "ReceiptBanner",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        alignment=1,
        textColor=colors.HexColor("#1e3a8a"),
    )

    label_style = ParagraphStyle(
        "LabelStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )

    value_style = ParagraphStyle(
        "ValueStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
    )

    th_style = ParagraphStyle(
        "ThStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=colors.white,
    )

    td_style = ParagraphStyle(
        "TdStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )

    td_left_style = ParagraphStyle(
        "TdLeftStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=0,
        textColor=colors.HexColor("#0f172a"),
    )

    td_bold_style = ParagraphStyle(
        "TdBoldStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # 1. School Header
    story.append(Paragraph("GREENWOOD INTERNATIONAL SCHOOL", school_title_style))
    story.append(Paragraph("Affiliated with Central Board of Secondary Education • Affiliation No. 1930482", school_sub_style))
    story.append(Paragraph("124 Campus Avenue, Academic District • Phone: +91 98765 43210 • info@greenwood.edu", school_sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=10))

    # 2. Receipt Badge & Meta
    receipt_meta_data = [
        [
            Paragraph("<b>RECEIPT NO:</b> " + data.receipt_number, label_style),
            Paragraph(f"<b>DATE:</b> {data.payment_date.strftime('%d-%b-%Y')}", label_style),
            Paragraph(f"<b>PAYMENT MODE:</b> {data.payment_method.upper()}", label_style),
        ]
    ]
    meta_table = Table(receipt_meta_data, colWidths=[200, 160, 160])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Student Details Card
    student_details = [
        [
            Paragraph("Student Name:", label_style),
            Paragraph(data.student_name, value_style),
            Paragraph("Admission Number:", label_style),
            Paragraph(data.admission_number, value_style),
        ],
        [
            Paragraph("Grade & Section:", label_style),
            Paragraph(f"{data.grade_name} - {data.section_name}", value_style),
            Paragraph("Cashier / Received By:", label_style),
            Paragraph(data.cashier_name, value_style),
        ],
    ]
    if data.transaction_reference:
        student_details.append([
            Paragraph("Transaction Ref:", label_style),
            Paragraph(data.transaction_reference, value_style),
            Paragraph("Remarks:", label_style),
            Paragraph(data.remarks or "Fee counter payment", value_style),
        ])

    student_table = Table(student_details, colWidths=[110, 160, 110, 140])
    student_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(student_table)
    story.append(Spacer(1, 14))

    # 4. Itemized Allocation Table
    alloc_headers = [
        Paragraph("Installment / Particulars", th_style),
        Paragraph("Due Date", th_style),
        Paragraph("Prior Balance (₹)", th_style),
        Paragraph("Amount Paid (₹)", th_style),
        Paragraph("New Balance (₹)", th_style),
    ]
    alloc_rows = [alloc_headers]

    for item in data.items:
        alloc_rows.append([
            Paragraph(item.installment_title, td_left_style),
            Paragraph(item.due_date.strftime("%d-%b-%Y"), td_style),
            Paragraph(f"{item.prior_outstanding:,.2f}", td_style),
            Paragraph(f"{item.amount_paid:,.2f}", td_bold_style),
            Paragraph(f"{item.new_outstanding:,.2f}", td_style),
        ])

    # Summary row
    alloc_rows.append([
        Paragraph("<b>TOTAL RECEIVED</b>", td_left_style),
        Paragraph("-", td_style),
        Paragraph("-", td_style),
        Paragraph(f"<b>₹ {data.amount_paid:,.2f}</b>", td_bold_style),
        Paragraph(f"<b>₹ {data.total_remaining_balance:,.2f}</b>", td_bold_style),
    ])

    alloc_table = Table(alloc_rows, colWidths=[180, 85, 85, 85, 85])
    alloc_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("INNERGRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#dbeafe")),
            ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#1e40af")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(alloc_table)
    story.append(Spacer(1, 14))

    # 5. Cash Counter Tendered Breakdown (if cash)
    if data.cash_tendered is not None and data.change_returned is not None:
        cash_data = [
            [
                Paragraph("<b>Cash Tendered:</b> " + f"₹ {data.cash_tendered:,.2f}", value_style),
                Paragraph("<b>Change Returned:</b> " + f"₹ {data.change_returned:,.2f}", value_style),
                Paragraph("<b>Net Settled:</b> " + f"₹ {data.amount_paid:,.2f}", value_style),
            ]
        ]
        cash_table = Table(cash_data, colWidths=[170, 170, 180])
        cash_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#f59e0b")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ])
        )
        story.append(cash_table)
        story.append(Spacer(1, 15))

    # 6. Outstanding Notice Box
    if data.total_remaining_balance > 0:
        notice_p = Paragraph(
            f"<b>Note:</b> An outstanding balance of <b>₹ {data.total_remaining_balance:,.2f}</b> remains for this academic year. Please clear pending dues before the upcoming examination cycle.",
            label_style,
        )
    else:
        notice_p = Paragraph(
            "<b>Note:</b> All dues for current installments are fully cleared. Thank you!",
            label_style,
        )
    notice_table = Table([[notice_p]], colWidths=[520])
    notice_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(notice_table)
    story.append(Spacer(1, 35))

    # 7. Signature & Seal Area
    sig_data = [
        [
            Paragraph("____________________________<br/><b>Parent / Depositor Signature</b>", label_style),
            Paragraph("____________________________<br/><b>Authorized Cashier & Seal</b>", label_style),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (0, 0), "LEFT"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ])
    )
    story.append(sig_table)
    story.append(Spacer(1, 25))

    # 8. Footer
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        alignment=1,
        textColor=colors.HexColor("#94a3b8"),
    )
    story.append(Paragraph("This is a computer-generated official school fee receipt. Generated via Greenwood School Management System.", footer_style))

    doc.build(story)
    return buffer.getvalue()


def generate_fee_payment_receipt_pdf(payment: Any) -> bytes:
    """Generate a clean, professional school fee payment receipt as PDF bytes for FeePayment."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "SchoolTitle2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e3a8a"),
        alignment=1,
    )

    subtitle_style = ParagraphStyle(
        "SchoolSubtitle2",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#4b5563"),
        alignment=1,
    )

    heading_style = ParagraphStyle(
        "ReceiptHeading2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#111827"),
    )

    label_style = ParagraphStyle(
        "FieldLabel2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#374151"),
    )

    value_style = ParagraphStyle(
        "FieldValue2",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#111827"),
    )

    amount_header_style = ParagraphStyle(
        "AmountHeader2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.white,
    )

    amount_value_style = ParagraphStyle(
        "AmountValue2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#065f46"),
    )

    story = []

    # School Header
    story.append(Paragraph("GREENWOOD HIGH SCHOOL", title_style))
    story.append(Paragraph("Affiliated to CBSE &bull; Affiliation No. 1930284 &bull; School Code: 40219", subtitle_style))
    story.append(Paragraph("12 Campus Way, Knowledge City &bull; Phone: +91 98765 43210 &bull; Email: accounts@school.local", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=12))

    # Receipt Title Bar
    receipt_title_data = [
        [
            Paragraph("<b>FEE PAYMENT RECEIPT</b>", heading_style),
            Paragraph(f"<b>Receipt No:</b> {payment.receipt_number}", ParagraphStyle("RightReceipt", parent=heading_style, alignment=2)),
        ]
    ]
    t_header = Table(receipt_title_data, colWidths=[280, 240])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 8))

    # Student & Parent Details
    installment = getattr(payment, "installment", None)
    assignment = getattr(installment, "assignment", None) if installment else None
    student = getattr(assignment, "student", None) if assignment else None
    academic_year = getattr(assignment, "academic_year", None) if assignment else None
    grade = getattr(assignment, "grade", None) if assignment else None
    transaction = getattr(payment, "transaction", None)

    student_name = f"{student.first_name} {student.last_name}" if student else "N/A"
    student_code = getattr(student, "student_code", None) or "N/A"
    enrollment_no = getattr(student, "enrollment_number", None) or "N/A"
    grade_name = getattr(grade, "name", None) or "N/A"
    acad_year_name = getattr(academic_year, "name", None) or "N/A"

    parent = getattr(transaction, "parent", None)
    if not parent and student and hasattr(student, "parent_links") and student.parent_links:
        parent = student.parent_links[0].parent

    parent_name = f"{parent.first_name} {parent.last_name}" if parent else "Parent / Guardian"
    parent_phone = getattr(parent, "phone", None) or "N/A"

    p_date_str = payment.payment_date.strftime("%d %b %Y") if payment.payment_date else "N/A"

    info_data = [
        [
            Paragraph("Student Name:", label_style),
            Paragraph(student_name, value_style),
            Paragraph("Payment Date:", label_style),
            Paragraph(p_date_str, value_style),
        ],
        [
            Paragraph("Student Code / ID:", label_style),
            Paragraph(student_code, value_style),
            Paragraph("Academic Year:", label_style),
            Paragraph(acad_year_name, value_style),
        ],
        [
            Paragraph("Enrollment Number:", label_style),
            Paragraph(enrollment_no, value_style),
            Paragraph("Grade / Class:", label_style),
            Paragraph(grade_name, value_style),
        ],
        [
            Paragraph("Parent / Guardian:", label_style),
            Paragraph(parent_name, value_style),
            Paragraph("Contact Phone:", label_style),
            Paragraph(parent_phone, value_style),
        ],
    ]

    t_info = Table(info_data, colWidths=[105, 155, 105, 155])
    t_info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 12))

    # Payment Item Breakdown Table
    inst_name = getattr(installment, "installment_name", "Fee Installment") if installment else "Fee Installment"
    rzp_order_id = getattr(transaction, "gateway_order_id", "N/A") if transaction else "N/A"
    rzp_payment_id = getattr(transaction, "gateway_payment_id", "N/A") if transaction and transaction.gateway_payment_id else "N/A"
    pay_method = (getattr(transaction, "payment_method", None) or getattr(payment, "payment_method", "Online Gateway")) or "Online Gateway"

    items_header = [
        Paragraph("Description / Item", amount_header_style),
        Paragraph("Gateway / Payment ID", amount_header_style),
        Paragraph("Method", amount_header_style),
        Paragraph("Amount Paid (₹)", ParagraphStyle("RightAmtH", parent=amount_header_style, alignment=2)),
    ]

    items_data = [
        items_header,
        [
            Paragraph(f"<b>{inst_name}</b><br/><font color='#64748b' size='7.5'>Ref: {rzp_order_id}</font>", value_style),
            Paragraph(rzp_payment_id, value_style),
            Paragraph(pay_method.replace("_", " ").title(), value_style),
            Paragraph(f"<b>₹{payment.amount:,.2f}</b>", ParagraphStyle("RightAmtV", parent=value_style, alignment=2)),
        ],
    ]

    t_items = Table(items_data, colWidths=[180, 160, 85, 95])
    t_items.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
        ("TOPPADDING", (0, 0), (-1, 0), 5),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 10))

    # Summary Table: Total Paid & Outstanding Balance
    remaining_balance = getattr(installment, "outstanding_amount", Decimal("0.00")) if installment else Decimal("0.00")
    total_inst_amount = getattr(installment, "amount", payment.amount) if installment else payment.amount

    summary_data = [
        [
            Paragraph("<b>Total Installment Fee:</b>", label_style),
            Paragraph(f"₹{total_inst_amount:,.2f}", ParagraphStyle("SumRight", parent=value_style, alignment=2)),
        ],
        [
            Paragraph("<b>Amount Paid This Receipt:</b>", label_style),
            Paragraph(f"<b>₹{payment.amount:,.2f}</b>", ParagraphStyle("SumRightGreen", parent=amount_value_style, alignment=2)),
        ],
        [
            Paragraph("<b>Remaining Outstanding Balance:</b>", label_style),
            Paragraph(f"₹{remaining_balance:,.2f}", ParagraphStyle("SumRightBal", parent=value_style, alignment=2)),
        ],
        [
            Paragraph("<b>Payment Status:</b>", label_style),
            Paragraph(
                "<font color='#065f46'><b>COMPLETED (CAPTURED)</b></font>" if payment.status == "completed" else payment.status.upper(),
                ParagraphStyle("SumRightStatus", parent=value_style, alignment=2),
            ),
        ],
    ]

    t_summary = Table(summary_data, colWidths=[380, 140])
    t_summary.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 18))

    # Footer Notes
    footer_text = (
        "<i>Note: This is a computer-generated electronic receipt issued upon verified online payment via Razorpay Payment Gateway. "
        "No physical signature is required. For any billing inquiries, please contact accounts@school.local quoting your receipt number.</i>"
    )
    footer_style = ParagraphStyle(
        "Footer2",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        alignment=1,
        textColor=colors.HexColor("#64748b"),
    )
    story.append(Paragraph(footer_text, footer_style))

    doc.build(story)
    return buffer.getvalue()

