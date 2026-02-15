from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from config.settings import settings
from fastapi.security import OAuth2PasswordBearer
from fastapi import Security
from typing import List

# Define OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Simulated roles and permissions database
roles_permissions = {
    "admin": ["create_apartment", "create_resident"],
    "manager": ["create_resident"],
    "viewer": []
}

# Simulated user roles database
user_roles = {
    "user1": "admin",
    "user2": "manager",
    "user3": "viewer"
}

def get_current_user(token: str = Security(oauth2_scheme)):
    # Simulate token decoding to get the username
    # In a real application, you would decode the token and verify it
    user = token  # For simplicity, assume token is the username
    if user not in user_roles:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user

def check_permissions(user: str, required_permission: str):
    role = user_roles.get(user)
    if role is None or required_permission not in roles_permissions.get(role, []):
        raise HTTPException(status_code=403, detail="Not enough permissions")

router = APIRouter(
    prefix="/onboarding",
    tags=["onboarding"]
)

# Database simulation
fake_apartments_db = {}
fake_residents_db = {}

class Apartment(BaseModel):
    id: str
    name: str
    address: str
    num_units: int

class Resident(BaseModel):
    id: str
    name: str
    email: str
    apartment_id: str

@router.post("/apartment")
def create_apartment(apartment: Apartment, user: str = Depends(get_current_user)):
    check_permissions(user, "create_apartment")
    if apartment.id in fake_apartments_db:
        raise HTTPException(status_code=400, detail="Apartment already exists")
    fake_apartments_db[apartment.id] = apartment
    return {"message": "Apartment created successfully", "apartment": apartment}

@router.post("/resident")
def create_resident(resident: Resident, user: str = Depends(get_current_user)):
    check_permissions(user, "create_resident")
    if resident.id in fake_residents_db:
        raise HTTPException(status_code=400, detail="Resident already exists")
    if resident.apartment_id not in fake_apartments_db:
        raise HTTPException(status_code=404, detail="Apartment not found")
    fake_residents_db[resident.id] = resident
    return {"message": "Resident created successfully", "resident": resident}