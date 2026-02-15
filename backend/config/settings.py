from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Apartment Management API"
    cosmos_db_url: str = ""
    cosmos_db_key: str = ""
    cosmos_db_name: str = ""
    
    model_config = {"env_file": ".env"}

settings = Settings()