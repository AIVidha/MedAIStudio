from fastapi import APIRouter

router = APIRouter(prefix="/optimization", tags=["optimization"])

@router.get("/pareto")
def get_pareto_models():
    return {"status": "ok", "models": []}
