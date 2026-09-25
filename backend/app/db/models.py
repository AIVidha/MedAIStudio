import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="researcher") # admin, researcher, annotator, viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    vertical_id: Mapped[str] = mapped_column(String, default="cardiac_mri")
    anatomy: Mapped[str] = mapped_column(String, default="Heart")
    modality: Mapped[str] = mapped_column(String, default="Short-axis Cine MRI")
    task: Mapped[str] = mapped_column(String, default="Multi-Structure Segmentation")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    dataset_id: Mapped[str] = mapped_column(String, ForeignKey("datasets.id"))
    version_tag: Mapped[str] = mapped_column(String)
    changelog: Mapped[str] = mapped_column(Text, nullable=True)
    num_subjects: Mapped[int] = mapped_column(Integer, default=0)
    num_studies: Mapped[int] = mapped_column(Integer, default=0)
    num_series: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    dataset_id: Mapped[str] = mapped_column(String, ForeignKey("datasets.id"))
    pseudonym_id: Mapped[str] = mapped_column(String, index=True) # e.g. patient001
    research_group: Mapped[str] = mapped_column(String, nullable=True) # NOR, MINF, DCM, HCM, RV
    height_cm: Mapped[float] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=True)
    meta_info: Mapped[dict] = mapped_column(JSON, nullable=True)

class Study(Base):
    __tablename__ = "studies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"))
    study_uid: Mapped[str] = mapped_column(String)
    study_date: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)

class Series(Base):
    __tablename__ = "series"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    study_id: Mapped[str] = mapped_column(String, ForeignKey("studies.id"))
    series_uid: Mapped[str] = mapped_column(String)
    modality: Mapped[str] = mapped_column(String, default="MR")
    file_path: Mapped[str] = mapped_column(String)
    dimensions: Mapped[dict] = mapped_column(JSON) # e.g. [216, 256, 10, 30]
    spacing: Mapped[dict] = mapped_column(JSON) # e.g. [1.56, 1.56, 10.0]
    frame_info: Mapped[dict] = mapped_column(JSON, nullable=True) # e.g. {"ED": 1, "ES": 12}
    is_4d: Mapped[bool] = mapped_column(Boolean, default=False)

class Split(Base):
    __tablename__ = "splits"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String, ForeignKey("dataset_versions.id"))
    split_type: Mapped[str] = mapped_column(String) # train, val, test
    patient_ids: Mapped[dict] = mapped_column(JSON) # list of patient IDs

class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    series_id: Mapped[str] = mapped_column(String, ForeignKey("series.id"))
    frame_index: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String) # manual, ai, ai_edited
    status: Mapped[str] = mapped_column(String, default="draft") # draft, accepted, rejected
    file_path: Mapped[str] = mapped_column(String)
    author_id: Mapped[str] = mapped_column(String, nullable=True)
    model_version_id: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class ModelArchitecture(Base):
    __tablename__ = "model_architectures"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, unique=True) # UNet, BasicUNetPlusPlus, EfficientUNet, SegResNet
    display_name: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text)
    num_parameters: Mapped[int] = mapped_column(Integer)
    flops: Mapped[float] = mapped_column(Float) # in GFLOPs
    supported_inputs: Mapped[dict] = mapped_column(JSON)

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    architecture_id: Mapped[str] = mapped_column(String, ForeignKey("model_architectures.id"))
    version_tag: Mapped[str] = mapped_column(String)
    weights_path: Mapped[str] = mapped_column(String, nullable=True)
    onnx_path: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="registered") # registered, trained, validated, deployed
    checksum: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String)
    model_version_id: Mapped[str] = mapped_column(String, ForeignKey("model_versions.id"))
    dataset_version_id: Mapped[str] = mapped_column(String, ForeignKey("dataset_versions.id"))
    training_profile: Mapped[str] = mapped_column(String, default="quick") # quick, full
    epochs: Mapped[int] = mapped_column(Integer)
    best_epoch: Mapped[int] = mapped_column(Integer, nullable=True)
    best_val_dice: Mapped[float] = mapped_column(Float, nullable=True)
    best_val_iou: Mapped[float] = mapped_column(Float, nullable=True)
    git_commit: Mapped[str] = mapped_column(String, nullable=True)
    config: Mapped[dict] = mapped_column(JSON, nullable=True)
    hardware: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class EpochMetric(Base):
    __tablename__ = "epoch_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    experiment_id: Mapped[str] = mapped_column(String, ForeignKey("experiments.id"))
    epoch: Mapped[int] = mapped_column(Integer)
    train_loss: Mapped[float] = mapped_column(Float)
    val_loss: Mapped[float] = mapped_column(Float)
    val_dice: Mapped[float] = mapped_column(Float)
    val_iou: Mapped[float] = mapped_column(Float)

class BenchmarkResult(Base):
    __tablename__ = "benchmark_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    model_version_id: Mapped[str] = mapped_column(String, ForeignKey("model_versions.id"))
    dataset_version_id: Mapped[str] = mapped_column(String, ForeignKey("dataset_versions.id"))
    split_name: Mapped[str] = mapped_column(String, default="test")
    mean_dice: Mapped[float] = mapped_column(Float)
    lv_dice: Mapped[float] = mapped_column(Float)
    rv_dice: Mapped[float] = mapped_column(Float)
    myo_dice: Mapped[float] = mapped_column(Float)
    mean_iou: Mapped[float] = mapped_column(Float)
    num_parameters: Mapped[int] = mapped_column(Integer)
    flops: Mapped[float] = mapped_column(Float)
    model_size_mb: Mapped[float] = mapped_column(Float)
    latency_median_ms: Mapped[float] = mapped_column(Float)
    latency_p95_ms: Mapped[float] = mapped_column(Float)
    hardware: Mapped[str] = mapped_column(String)
    is_precomputed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class InferenceRun(Base):
    __tablename__ = "inference_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    model_version_id: Mapped[str] = mapped_column(String, ForeignKey("model_versions.id"))
    dataset_version_id: Mapped[str] = mapped_column(String, ForeignKey("dataset_versions.id"))
    status: Mapped[str] = mapped_column(String, default="pending")
    processing_time_ms: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class CardiacMeasurement(Base):
    __tablename__ = "cardiac_measurements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"))
    source: Mapped[str] = mapped_column(String) # ground_truth or model_prediction
    model_version_id: Mapped[str] = mapped_column(String, nullable=True)
    lv_edv_ml: Mapped[float] = mapped_column(Float, nullable=True)
    lv_esv_ml: Mapped[float] = mapped_column(Float, nullable=True)
    lv_sv_ml: Mapped[float] = mapped_column(Float, nullable=True)
    lv_ef_percent: Mapped[float] = mapped_column(Float, nullable=True)
    rv_edv_ml: Mapped[float] = mapped_column(Float, nullable=True)
    rv_esv_ml: Mapped[float] = mapped_column(Float, nullable=True)
    rv_sv_ml: Mapped[float] = mapped_column(Float, nullable=True)
    rv_ef_percent: Mapped[float] = mapped_column(Float, nullable=True)
    myo_mass_g: Mapped[float] = mapped_column(Float, nullable=True)
    max_wall_thickness_mm: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class ClassifierOutput(Base):
    __tablename__ = "classifier_outputs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"))
    predicted_group: Mapped[str] = mapped_column(String) # NOR, MINF, DCM, HCM, RV
    probabilities: Mapped[dict] = mapped_column(JSON) # e.g. {"NOR": 0.8, "DCM": 0.1, ...}
    cv_accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    test_accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    model_version_id: Mapped[str] = mapped_column(String, ForeignKey("model_versions.id"))
    endpoint_url: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="ready") # ready, stopped
    target_format: Mapped[str] = mapped_column(String, default="ONNX")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    type: Mapped[str] = mapped_column(String) # training, inference, benchmark
    status: Mapped[str] = mapped_column(String, default="pending") # pending, running, completed, failed
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    details: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String, default="system")
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String)
    details: Mapped[str] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str] = mapped_column(String, default="127.0.0.1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
