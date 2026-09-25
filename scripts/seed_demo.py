import sys
import os

# Always run relative to backend/ so SQLite resolves to backend/medai_studio.db
_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
os.chdir(_BACKEND_DIR)
sys.path.insert(0, _BACKEND_DIR)

from app.db.session import SessionLocal, init_db
from app.db.models import User, Project, ModelArchitecture, Dataset
from app.core.security import get_password_hash

def seed_demo():
    print("Initializing Database Schemas...")
    init_db()
    db = SessionLocal()

    # Seed Admin User
    admin = db.query(User).filter(User.email == "admin@medaistudio.local").first()
    if not admin:
        admin = User(
            email="admin@medaistudio.local",
            full_name="MedAI Demo Admin",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin)
        print("Created demo user: admin@medaistudio.local / admin123")

    # Seed Default Project
    project = db.query(Project).filter(Project.name == "Cardiac MRI AI Demo").first()
    if not project:
        project = Project(
            name="Cardiac MRI AI Demo",
            description="Short-axis cine MRI segmentation of LV, RV, myocardium, plus research quantification.",
            vertical_id="cardiac_mri",
            anatomy="Heart",
            modality="Short-axis Cine MRI",
            task="Multi-Structure Segmentation"
        )
        db.add(project)
        print("Created demo project: Cardiac MRI AI Demo")

    # Seed Architectures
    architectures = [
        ("UNet", "U-Net", "Classic 2D Medical U-Net with contracting and expansive paths.", 14800000, 42.5),
        ("BasicUNetPlusPlus", "U-Net++", "Nested U-Net with dense skip connections.", 18200000, 56.1),
        ("EfficientUNet", "Efficient-UNet", "Lightweight U-Net with EfficientNet-B0 backbone.", 7500000, 28.4),
        ("SegResNet", "SegResNet", "ResNet-based medical image segmentation network.", 11200000, 35.8),
    ]

    for name, display_name, summary, params, flops in architectures:
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.name == name).first()
        if not arch:
            arch = ModelArchitecture(
                name=name,
                display_name=display_name,
                summary=summary,
                num_parameters=params,
                flops=flops,
                supported_inputs={"spatial_dims": 2, "channels": 1, "size": [160, 160]}
            )
            db.add(arch)

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_demo()
