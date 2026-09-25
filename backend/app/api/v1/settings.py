from fastapi import APIRouter

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("")
def get_settings():
    return {
        "retention_days": 30,
        "anonymize_on_import": True,
        "disclaimer": "Research prototype — not for clinical use."
    }
