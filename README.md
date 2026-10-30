# Student Management API

Modular **FastAPI** backend with JWT authentication, SQLAlchemy 2.0 ORM, and Alembic database migrations.

## Project Structure
```
student-management/
├── main.py                    # creates the FastAPI() app, includes routers
├── config.py                  # Settings via pydantic-settings (env vars)
├── database.py                # SQLAlchemy engine, sessionmaker, Base
├── dependencies.py            # shared Depends() functions (get_db, get_current_user)
├── core/
│   └── security.py            # password hashing (bcrypt), JWT encode/decode
├── routers/
│   ├── users.py               # APIRouter for /users endpoints (register, login, me)
│   └── items.py               # APIRouter for /items endpoints (CRUD)
├── schemas/                   # Pydantic models (request/response)
│   ├── user.py
│   └── item.py
├── models/                    # SQLAlchemy ORM classes
│   ├── user.py
│   └── item.py
├── crud/                      # DB access functions per resource
│   ├── user.py
│   └── item.py
├── alembic/                   # Alembic migration environment
├── alembic.ini                # Alembic configuration
├── requirements.txt           # Pinned Python dependencies
└── README.md
```

## Getting Started

### 1. Environment Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials & secret key
```

### 3. Database Migrations (Alembic)
```bash
# Generate initial migration
alembic revision --autogenerate -m "create users and items tables"

# Apply migrations
alembic upgrade head
```

### 4. Run Development Server
```bash
uvicorn main:app --reload
```

- Swagger UI Documentation: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/health`
