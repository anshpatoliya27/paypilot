import pytest
from app.core.config import Settings

def test_settings_initialization():
    settings = Settings()
    assert settings.PROJECT_NAME == "PayPilot"
    assert settings.APP_ENV in ["development", "staging", "production"]
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) > 0

def test_cors_origins_parsing():
    settings = Settings(CORS_ORIGINS="http://localhost:5173, http://example.com")
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert "http://example.com" in settings.CORS_ORIGINS
