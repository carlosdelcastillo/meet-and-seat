from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://meetandseat:meetandseat@localhost:5432/meetandseat"
    secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = {"env_prefix": "MAS_", "env_file": ".env"}


settings = Settings()
