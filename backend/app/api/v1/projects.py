from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
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
    id: str
    name: str
    description: Optional[str]
    vertical_id: str
    anatomy: str
    modality: str
    task: str

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

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
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
