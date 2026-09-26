from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

from app.db.session import get_db
from app.db.models import Project

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    vertical_id: str = "cardiac_mri"
    anatomy: str = "Heart"
    modality: str = "Short-axis Cine MRI"
    task: str = "Multi-Structure Segmentation"

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    vertical_id: str
    anatomy: str
    modality: str
    task: str

@router.get("")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "vertical_id": p.vertical_id,
            "anatomy": p.anatomy,
            "modality": p.modality,
            "task": p.task,
        }
        for p in projects
    ]

@router.post("", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        vertical_id=project_in.vertical_id,
        anatomy=project_in.anatomy,
        modality=project_in.modality,
        task=project_in.task
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "vertical_id": project.vertical_id,
        "anatomy": project.anatomy,
        "modality": project.modality,
        "task": project.task,
    }

@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "vertical_id": project.vertical_id,
        "anatomy": project.anatomy,
        "modality": project.modality,
        "task": project.task,
    }
