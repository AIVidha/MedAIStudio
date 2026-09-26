from fastapi import APIRouter
from app.api.v1 import (
    auth, projects, datasets, studies, annotations,
    inference, models, experiments, benchmarks,
    optimization, cardiac, reports, deployments,
    audit, settings, health, viewer
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(datasets.router)
api_router.include_router(studies.router)
api_router.include_router(annotations.router)
api_router.include_router(inference.router)
api_router.include_router(models.router)
api_router.include_router(experiments.router)
api_router.include_router(benchmarks.router)
api_router.include_router(optimization.router)
api_router.include_router(cardiac.router)
api_router.include_router(reports.router)
api_router.include_router(deployments.router)
api_router.include_router(audit.router)
api_router.include_router(settings.router)
api_router.include_router(viewer.router)
