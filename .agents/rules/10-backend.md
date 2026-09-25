# Rule 10: Backend Architecture & API Standards

**Activation:** Always On

## 1. Stack & Tools
- Python 3.11+, FastAPI framework, Pydantic v2 schemas.
- SQLAlchemy 2 ORM with AsyncSession/SyncSession support, Alembic migrations.
- PostgreSQL 16 for production containerized deployment; SQLite for local unit tests and rapid dev.

## 2. API Design & Versioning
- Route paths must be versioned under `/api/v1/`.
- Use standard FastAPI HTTP exception handling with clean JSON schemas.
- All endpoints must include descriptive docstrings for OpenAPI UI documentation (`/docs`).

## 3. Data Entities & Multi-Organ Architecture
- Modular vertical design: vertical configurations reside in `configs/verticals/` and backend registries in `backend/app/verticals/`.
- Medical image calculations (volumes, EF, mass) must strictly use spacing and affines extracted from NIfTI file headers via NiBabel / SimpleITK.
