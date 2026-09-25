import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from scripts.make_synthetic import generate_synthetic_dataset

def test_datasets_scan_local(client):
    # Ensure synthetic dataset is generated
    generate_synthetic_dataset(num_patients=2, output_dir="./data/synthetic")
    res = client.post("/api/v1/datasets/scan-local")
    assert res.status_code == 200
    data = res.json()
    assert "available_datasets" in data
    assert len(data["available_datasets"]) >= 1

def test_datasets_import_synthetic(client):
    # Ensure project exists
    client.post("/api/v1/projects", json={
        "name": "Test Project",
        "description": "Test Project",
        "vertical_id": "cardiac_mri",
        "anatomy": "Heart",
        "modality": "Short-axis Cine MRI",
        "task": "Multi-Structure Segmentation"
    })
    res = client.post("/api/v1/datasets/import/synthetic")
    assert res.status_code == 200
    data = res.json()
    assert "dataset_id" in data or "message" in data

def test_cardiac_quantification(client):
    generate_synthetic_dataset(num_patients=2, output_dir="./data/synthetic")
    res = client.post("/api/v1/cardiac/compute-quantification/patient001")
    assert res.status_code == 200
    data = res.json()
    assert data["subject_id"] == "patient001"
    assert "disclaimer" in data
    assert "metrics" in data
    assert "LV" in data["metrics"]
    assert "EF_percent" in data["metrics"]["LV"]

def test_benchmarks_run_suite(client):
    res = client.post("/api/v1/benchmarks/run-suite")
    assert res.status_code == 200
    data = res.json()
    assert "evaluated_models" in data

def test_optimization_topsis_ranking(client):
    client.post("/api/v1/benchmarks/run-suite")
    res = client.post("/api/v1/optimization/mcdm-rank", json={
        "dice": 0.5,
        "latency": 0.3,
        "params": 0.1,
        "flops": 0.1
    })
    assert res.status_code == 200
    data = res.json()
    assert "rankings" in data
    assert len(data["rankings"]) >= 1

def test_optimization_pareto(client):
    res = client.get("/api/v1/optimization/pareto")
    assert res.status_code == 200
    data = res.json()
    assert "pareto_frontier" in data

