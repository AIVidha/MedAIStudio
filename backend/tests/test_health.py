def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Research prototype" in data["disclaimer"]
    assert response.headers.get("X-Clinical-Disclaimer") == "Research prototype - not for clinical use."
