from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_apartment():
    response = client.post("/onboarding/apartment", json={
        "id": "apt1",
        "name": "Apartment 1",
        "address": "123 Main St",
        "num_units": 10
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Apartment created successfully"

def test_create_apartment_already_exists():
    # Create the apartment first
    client.post(
        "/onboarding/apartment",
        json={
            "id": "apt1",
            "name": "Sunset Apartments",
            "address": "123 Sunset Blvd",
            "num_units": 10
        }
    )

    # Try creating the same apartment again
    response = client.post(
        "/onboarding/apartment",
        json={
            "id": "apt1",
            "name": "Sunset Apartments",
            "address": "123 Sunset Blvd",
            "num_units": 10
        }
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Apartment already exists"}

def test_create_resident():
    client.post("/onboarding/apartment", json={
        "id": "apt1",
        "name": "Apartment 1",
        "address": "123 Main St",
        "num_units": 10
    })
    response = client.post("/onboarding/resident", json={
        "id": "res1",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "apartment_id": "apt1"
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Resident created successfully"