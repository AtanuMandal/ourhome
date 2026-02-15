from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    response = client.post("/auth/token", data={
        "username": "testuser@example.com",
        "password": "password"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_login_failure():
    response = client.post("/auth/token", data={
        "username": "wronguser@example.com",
        "password": "wrongpassword"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect username or password"