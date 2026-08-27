from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Union
from functools import lru_cache
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "PayPilot"
    APP_ENV: str = Field(default="development", description="Environment: development, staging, production")
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./paypilot.db",
        description="Async SQLAlchemy database URL (PostgreSQL asyncpg or SQLite aiosqlite)"
    )

    # Razorpay Credentials
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_placeholder_key", description="Razorpay API Key ID")
    RAZORPAY_KEY_SECRET: str = Field(default="rzp_test_placeholder_secret", description="Razorpay API Key Secret")
    RAZORPAY_WEBHOOK_SECRET: str = Field(default="paypilot_webhook_secret_dev", description="Razorpay Webhook Secret")

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
