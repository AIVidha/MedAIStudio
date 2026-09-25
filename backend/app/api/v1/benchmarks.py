from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import BenchmarkResult

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

@router.get("/results")
def list_benchmark_results(db: Session = Depends(get_db)):
    return db.query(BenchmarkResult).all()
