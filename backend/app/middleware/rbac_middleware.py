from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import OAuth2PasswordBearer
from typing import Callable

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

class RBACMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, get_user: Callable):
        super().__init__(app)
        self.get_user = get_user

    async def dispatch(self, request: Request, call_next):
        # Extract token from the request
        token = await oauth2_scheme(request)
        user = self.get_user(token)

        # Check if the user has the required permissions for the endpoint
        endpoint = request.url.path
        method = request.method.lower()
        required_permission = f"{method}_{endpoint.strip('/').replace('/', '_')}"

        role = user_roles.get(user)
        if role is None or required_permission not in roles_permissions.get(role, []):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        response = await call_next(request)
        return response

# Example of a get_user function
def get_user(token: str):
    # Simulate token decoding to get the username
    # In a real application, you would decode the token and verify it
    user = token  # For simplicity, assume token is the username
    if user not in user_roles:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user