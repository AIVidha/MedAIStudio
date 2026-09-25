from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MedAI Studio API",
        "disclaimer": "Research prototype — not for clinical use."
    }
