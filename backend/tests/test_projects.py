def test_create_and_list_project(client):
    res = client.post("/api/v1/projects", json={
        "name": "Test Cardiac MRI",
        "description": "Test Cardiac MRI project",
        "vertical_id": "cardiac_mri",
        "anatomy": "Heart",
        "modality": "Short-axis Cine MRI",
        "task": "Multi-Structure Segmentation"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test Cardiac MRI"
    assert data["vertical_id"] == "cardiac_mri"

    list_res = client.get("/api/v1/projects")
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) >= 1
