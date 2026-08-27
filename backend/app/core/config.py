from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "PayPilot"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./paypilot.db"

    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder_key"
    RAZORPAY_KEY_SECRET: str = "rzp_test_placeholder_secret"
    RAZORPAY_WEBHOOK_SECRET: str = "paypilot_webhook_secret_dev"

    # AI Configuration
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "gemini" # 'gemini', 'openai', or 'mock'
    
    # Model Names
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
