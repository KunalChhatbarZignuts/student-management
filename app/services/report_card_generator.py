import datetime as dt
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.examination import StudentResultResponse


def generate_report_card_pdf(result: StudentResultResponse) -> bytes:
    """Generate a clean, high-resolution official school report card PDF."""
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
    school_title_style = ParagraphStyle(
        "SchoolTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        alignment=1,  # Center
        textColor=colors.HexColor("#0f172a"),
    )

    school_subtitle_style = ParagraphStyle(
        "SchoolSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        alignment=1,
        textColor=colors.HexColor("#475569"),
    )

    report_title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.HexColor("#1e40af"),
    )

    label_style = ParagraphStyle(
        "LabelStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
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
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        alignment=1,
        textColor=colors.white,
    )

    td_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )

    td_left_style = ParagraphStyle(
        "TableCellLeft",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=0,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # 1. School Header
    story.append(Paragraph("STUDENT MANAGEMENT ACADEMY", school_title_style))
    story.append(Paragraph("Excellence in Education • Affiliation No. SMA-2026-EDU", school_subtitle_style))
    story.append(Paragraph("100 Innovation Boulevard, Knowledge City • academic@school.edu", school_subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e40af"), spaceAfter=12))

    # 2. Report Card Title & Academic Term
    story.append(Paragraph(f"OFFICIAL STUDENT REPORT CARD • {result.exam_name.upper()}", report_title_style))
    story.append(Paragraph(f"Academic Year: {result.academic_year} | Term: {result.term}", school_subtitle_style))
    story.append(Spacer(1, 12))

    # 3. Student Information Grid
    info_data = [
        [
            Paragraph("Student Name:", label_style),
            Paragraph(result.student_name, value_style),
            Paragraph("Enrollment No:", label_style),
            Paragraph(result.enrollment_number or "—", value_style),
        ],
        [
            Paragraph("Grade & Section:", label_style),
            Paragraph(f"{result.grade_name} - {result.section_name}", value_style),
            Paragraph("Roll Number:", label_style),
            Paragraph(str(result.roll_no or "—"), value_style),
        ],
        [
            Paragraph("Class Teacher:", label_style),
            Paragraph(result.class_teacher_name or "Assigned Faculty", value_style),
            Paragraph("Date of Issue:", label_style),
            Paragraph(dt.date.today().strftime("%d %b %Y"), value_style),
        ],
    ]

    info_table = Table(info_data, colWidths=[1.3 * inch, 2.2 * inch, 1.3 * inch, 2.2 * inch])
    info_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(info_table)
    story.append(Spacer(1, 15))

    # 4. Subject-wise Marks Table
    headers = [
        Paragraph("#", th_style),
        Paragraph("Subject", th_style),
        Paragraph("Code", th_style),
        Paragraph("Max Marks", th_style),
        Paragraph("Pass Marks", th_style),
        Paragraph("Marks Obtained", th_style),
        Paragraph("Grade", th_style),
        Paragraph("Status", th_style),
    ]

    rows = [headers]
    for idx, subj in enumerate(result.subject_marks, start=1):
        if subj.is_absent:
            score_txt = "ABSENT (0.0)"
            grade_txt = "AB"
            status_txt = "FAIL"
        elif subj.marks_obtained is not None:
            score_txt = f"{subj.marks_obtained:.1f}"
            grade_txt = subj.grade or "—"
            status_txt = "PASS" if subj.is_passed else "FAIL"
        else:
            score_txt = "—"
            grade_txt = "—"
            status_txt = "PENDING"

        rows.append([
            Paragraph(str(idx), td_style),
            Paragraph(subj.subject_name, td_left_style),
            Paragraph(subj.subject_code, td_style),
            Paragraph(f"{subj.max_marks:.0f}", td_style),
            Paragraph(f"{subj.pass_marks:.0f}", td_style),
            Paragraph(score_txt, td_style),
            Paragraph(grade_txt, td_style),
            Paragraph(status_txt, td_style),
        ])

    # Summary Row
    summary_row = [
        Paragraph("", td_style),
        Paragraph("<b>TOTALS</b>", td_left_style),
        Paragraph("", td_style),
        Paragraph(f"<b>{result.total_max_marks:.0f}</b>", td_style),
        Paragraph("", td_style),
        Paragraph(f"<b>{result.total_obtained_marks:.1f}</b>", td_style),
        Paragraph(f"<b>{result.overall_grade}</b>", td_style),
        Paragraph(f"<b>{result.overall_result}</b>", td_style),
    ]
    rows.append(summary_row)

    marks_table = Table(
        rows,
        colWidths=[0.35 * inch, 2.1 * inch, 0.75 * inch, 0.8 * inch, 0.8 * inch, 1.1 * inch, 0.65 * inch, 0.75 * inch],
    )

    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e2e8f0")),
    ]

    for i in range(1, len(rows) - 1):
        if i % 2 == 0:
            t_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")))

    marks_table.setStyle(TableStyle(t_style))
    story.append(marks_table)
    story.append(Spacer(1, 15))

    # 5. Overall Performance & Remarks Box
    perf_data = [
        [
            Paragraph("<b>Overall Percentage:</b>", label_style),
            Paragraph(f"<b>{result.percentage:.2f}%</b>", value_style),
            Paragraph("<b>Final Grade:</b>", label_style),
            Paragraph(f"<b>{result.overall_grade}</b>", value_style),
            Paragraph("<b>Academic Result:</b>", label_style),
            Paragraph(f"<b>{result.overall_result}</b>", value_style),
        ],
        [
            Paragraph("<b>Teacher Remarks:</b>", label_style),
            Paragraph(
                result.teacher_remarks or "Consistent performance throughout the term. Keep up the dedication.",
                value_style,
            ),
            Paragraph("", label_style),
            Paragraph("", label_style),
            Paragraph("", label_style),
            Paragraph("", label_style),
        ],
    ]

    perf_table = Table(perf_data, colWidths=[1.4 * inch, 1.0 * inch, 1.0 * inch, 0.9 * inch, 1.3 * inch, 1.4 * inch])
    perf_table.setStyle(
        TableStyle([
            ("SPAN", (1, 1), (5, 1)),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#3b82f6")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bfdbfe")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(perf_table)
    story.append(Spacer(1, 25))

    # 6. Signatures & Verification Area
    sig_data = [
        [
            Paragraph("____________________________<br/><b>Class Teacher Signature</b><br/>" + (result.class_teacher_name or ""), td_style),
            Paragraph("____________________________<br/><b>Controller of Examinations</b><br/>Academic Committee", td_style),
            Paragraph("____________________________<br/><b>Principal Signature</b><br/>Student Management Academy", td_style),
        ]
    ]

    sig_table = Table(sig_data, colWidths=[2.4 * inch, 2.4 * inch, 2.4 * inch])
    sig_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(sig_table)
    story.append(Spacer(1, 15))

    # 7. Official Seal & Notice Footer
    notice_style = ParagraphStyle(
        "NoticeStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10,
        alignment=1,
        textColor=colors.HexColor("#64748b"),
    )
    story.append(
        Paragraph(
            "This document is an official computer-generated student report card issued by Student Management Academy. "
            "Grades and percentages are calculated as per institutional grading regulations. For verification, contact the examination controller.",
            notice_style,
        )
    )

    doc.build(story)
    return buffer.getvalue()

