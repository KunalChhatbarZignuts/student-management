import datetime as dt
import uuid
from app.db.session import SessionLocal
from app.models.academic_structure import AcademicYear
from app.models.calendar import HolidayCategory, SchoolHoliday, CalendarSpecialWorkingDay

def seed_calendar_demo():
    db = SessionLocal()
    try:
        ay = db.query(AcademicYear).filter(AcademicYear.name == "2026-2027").first()
        if not ay:
            ay = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()

        print(f"Target Academic Year: {ay.name} ({ay.id})")

        diwali_cat = db.query(HolidayCategory).filter(HolidayCategory.code == "diwali_vacation").first()
        pub_cat = db.query(HolidayCategory).filter(HolidayCategory.code == "public_holiday").first()

        # Check existing
        existing_vac = db.query(SchoolHoliday).filter(
            SchoolHoliday.academic_year_id == ay.id,
            SchoolHoliday.name == "Diwali Festival Vacation",
        ).first()

        if not existing_vac:
            vac = SchoolHoliday(
                name="Diwali Festival Vacation",
                category_id=diwali_cat.id if diwali_cat else pub_cat.id,
                academic_year_id=ay.id,
                start_date=dt.date(2026, 11, 8),
                end_date=dt.date(2026, 11, 14),
                description="Annual school Diwali festival and celebration vacation",
                status="active",
            )
            db.add(vac)
            print("Added Diwali Festival Vacation (2026-11-08 to 2026-11-14)")
        else:
            print("Diwali Vacation already exists")

        # Special Working Day on Sunday 2026-11-15
        sun_date = dt.date(2026, 11, 15)
        existing_special = db.query(CalendarSpecialWorkingDay).filter(
            CalendarSpecialWorkingDay.academic_year_id == ay.id,
            CalendarSpecialWorkingDay.date == sun_date,
        ).first()

        if not existing_special:
            sp = CalendarSpecialWorkingDay(
                academic_year_id=ay.id,
                date=sun_date,
                reason="Children's Day Special Academic Session & Exhibition",
            )
            db.add(sp)
            print("Added Special Working Sunday (2026-11-15)")
        else:
            print("Special working day already exists")

        db.commit()
        print("Calendar demo data seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_calendar_demo()

