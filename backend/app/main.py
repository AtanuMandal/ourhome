from fastapi import FastAPI
from fastapi.middleware import Middleware
from app.routers import onboarding, auth
from app.middleware.rbac_middleware import RBACMiddleware, get_user

# Add RBAC middleware
middleware = [
    Middleware(RBACMiddleware, get_user=get_user)
]

app = FastAPI(middleware=middleware)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Apartment Management API!"}

app.include_router(onboarding.router)
app.include_router(auth.router)