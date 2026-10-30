from typing import List, Optional
from sqlalchemy.orm import Session

from app import models, schemas


def get_student(db: Session, student_id: int) -> Optional[models.Student]:
    return db.query(models.Student).filter(models.Student.id == student_id).first()


def get_student_by_email(db: Session, email: str) -> Optional[models.Student]:
    return db.query(models.Student).filter(models.Student.email == email).first()


def get_students(db: Session, skip: int = 0, limit: int = 100) -> List[models.Student]:
    return db.query(models.Student).offset(skip).limit(limit).all()


def create_student(db: Session, student_in: schemas.StudentCreate) -> models.Student:
    db_student = models.Student(**student_in.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def update_student(
    db: Session, db_student: models.Student, student_in: schemas.StudentUpdate
) -> models.Student:
    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_student, field, value)
    db.commit()
    db.refresh(db_student)
    return db_student


def delete_student(db: Session, db_student: models.Student) -> None:
    db.delete(db_student)
    db.commit()


def get_course(db: Session, course_id: int) -> Optional[models.Course]:
    return db.query(models.Course).filter(models.Course.id == course_id).first()


def get_course_by_code(db: Session, code: str) -> Optional[models.Course]:
    return db.query(models.Course).filter(models.Course.code == code).first()


def get_courses(db: Session, skip: int = 0, limit: int = 100) -> List[models.Course]:
    return db.query(models.Course).offset(skip).limit(limit).all()


def create_course(db: Session, course_in: schemas.CourseCreate) -> models.Course:
    db_course = models.Course(**course_in.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


def enroll_student_in_course(
    db: Session, student: models.Student, course: models.Course
) -> models.Student:
    if course not in student.courses:
        student.courses.append(course)
        db.commit()
        db.refresh(student)
    return student
