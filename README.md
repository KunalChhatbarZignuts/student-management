# Student Management API

A complete RESTful Student Management API built with **FastAPI**, **SQLAlchemy**, and **PostgreSQL**.

## Features
- **Student CRUD**: Create, read, update, and delete student records.
- **Courses**: Create and browse courses.
- **Enrollment**: Enroll students into courses with relationship mapping.
- **Interactive Documentation**: Swagger UI at `/docs` and ReDoc at `/redoc`.

## Tech Stack
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.x
- **Database Driver**: Psycopg 3
- **Validation**: Pydantic v2
- **Server**: Uvicorn

## Getting Started

### 1. Setup Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Update DATABASE_URL in .env with your PostgreSQL credentials
```

### 3. Run the Application
```bash
uvicorn main:app --reload
```
The server will start at `http://127.0.0.1:8000`.
- API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
