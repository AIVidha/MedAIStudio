import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.db.models import ModelArchitecture

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    architectures = [
        ("UNet", "U-Net", "Classic 2D Medical U-Net.", 14800000, 42.5),
        ("BasicUNetPlusPlus", "U-Net++", "Nested U-Net.", 18200000, 56.1),
        ("EfficientUNet", "Efficient-UNet", "EfficientNet-B0 backbone.", 7500000, 28.4),
        ("SegResNet", "SegResNet", "ResNet-based segmentation.", 11200000, 35.8),
    ]
    for name, display_name, summary, params, flops in architectures:
        arch = ModelArchitecture(name=name, display_name=display_name, summary=summary, num_parameters=params, flops=flops, supported_inputs={"spatial_dims": 2})
        db.add(arch)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
