import os

base = r"C:\01. Atanu\Code\apartment_management\backend\src\ApartmentManagement.Infrastructure"
os.makedirs(os.path.join(base, "Persistence", "Repositories"), exist_ok=True)
os.makedirs(os.path.join(base, "Services"), exist_ok=True)
print("Directories created successfully")
