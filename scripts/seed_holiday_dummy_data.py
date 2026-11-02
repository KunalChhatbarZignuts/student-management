import datetime as dt
import uuid

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.academic_structure import AcademicYear, Grade
from app.models.calendar import HolidayCategory, SchoolHoliday
from app.services.calendar_service import seed_default_holiday_categories, create_school_holiday
from app.schemas.calendar import SchoolHolidayCreate


def seed_holidays():
    db = SessionLocal()
    try:
        print("1. Seeding default holiday categories...")
        categories = seed_default_holiday_categories(db)
        cat_map = {c.code: c.id for c in categories}
        print(f"   Seeded/found {len(categories)} categories.")

        print("2. Fetching active academic year...")
        ay = db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True))).scalar_one_or_none()
        if not ay:
            ay = db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc())).scalar_one_or_none()
        if not ay:
            print("   ERROR: No academic year found. Run academic year seed first.")
            return

        print(f"   Using Academic Year: {ay.name} (id: {ay.id})")

        sample_holidays = [
            {
                "name": "Diwali Vacation",
                "category_code": "diwali_vacation",
                "start_date": dt.date(2026, 11, 5),
                "end_date": dt.date(2026, 11, 12),
                "description": "Annual Diwali festival vacation for all grades.",
            },
            {
                "name": "Winter Vacation",
                "category_code": "winter_vacation",
                "start_date": dt.date(2026, 12, 24),
                "end_date": dt.date(2027, 1, 1),
                "description": "Christmas and New Year winter break.",
            },
            {
                "name": "Republic Day",
                "category_code": "national_holiday",
                "start_date": dt.date(2027, 1, 26),
                "end_date": dt.date(2027, 1, 26),
                "description": "78th Republic Day celebration and national holiday.",
            },
            {
                "name": "Maha Shivratri",
                "category_code": "religious_festival",
                "start_date": dt.date(2027, 3, 6),
                "end_date": dt.date(2027, 3, 6),
                "description": "Maha Shivratri religious festival.",
            },
            {
                "name": "Holi Festival",
                "category_code": "religious_festival",
                "start_date": dt.date(2027, 3, 22),
                "end_date": dt.date(2027, 3, 23),
                "description": "Festival of colours.",
            },
            {
                "name": "Summer Vacation",
                "category_code": "summer_vacation",
                "start_date": dt.date(2027, 5, 1),
                "end_date": dt.date(2027, 5, 31),
                "description": "Annual summer vacation.",
            },
        ]

        created_count = 0
        for h in sample_holidays:
            cat_id = cat_map.get(h["category_code"]) or categories[0].id
            existing = db.execute(
                select(SchoolHoliday).where(
                    SchoolHoliday.academic_year_id == ay.id,
                    SchoolHoliday.name == h["name"],
                )
            ).scalar_one_or_none()

            if not existing:
                create_school_holiday(
                    SchoolHolidayCreate(
                        name=h["name"],
                        category_id=cat_id,
                        academic_year_id=ay.id,
                        start_date=h["start_date"],
                        end_date=h["end_date"],
                        description=h["description"],
                        confirm_attendance_override=True,
                    ),
                    actor_user_id=None,
                    db=db,
                )
                print(f"   + Created holiday: {h['name']} ({h['start_date']} to {h['end_date']})")
                created_count += 1
            else:
                print(f"   = Already exists: {h['name']}")

        print(f"\nSuccessfully seeded {created_count} new school holidays!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding holidays: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_holidays()

