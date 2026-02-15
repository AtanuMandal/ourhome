from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_rbac_admin_access():
    # Admin user creating an apartment
    response = client.post(
        "/onboarding/apartment",
        headers={"Authorization": "Bearer user1"},
        json={
            "id": "apt1",
            "name": "Admin Apartment",
            "address": "123 Admin St",
            "num_units": 5
        }
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Apartment created successfully"

def test_rbac_manager_access_denied():
    # Manager trying to create an apartment (not allowed)
    response = client.post(
        "/onboarding/apartment",
        headers={"Authorization": "Bearer user2"},
        json={
            "id": "apt2",
            "name": "Manager Apartment",
            "address": "456 Manager St",
            "num_units": 3
        }
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"

def test_rbac_viewer_access_denied():
    # Viewer trying to create an apartment (not allowed)
    response = client.post(
        "/onboarding/apartment",
        headers={"Authorization": "Bearer user3"},
        json={
            "id": "apt3",
            "name": "Viewer Apartment",
            "address": "789 Viewer St",
            "num_units": 2
        }
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"