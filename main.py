"""Root application entrypoint wrapper.

Re-exports the FastAPI app instance from `app.main` so both commands work:
    1. uvicorn main:app --reload
    2. uvicorn app.main:app --reload
    3. python main.py
"""

from app.main import app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

