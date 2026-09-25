from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/generate")
def generate_report():
    return {"status": "ok", "message": "Report generator endpoint"}
