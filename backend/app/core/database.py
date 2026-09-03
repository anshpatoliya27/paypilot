from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator, Tuple, Dict, Any
from urllib.parse import urlparse, urlunparse
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def resolve_db_url_and_args(raw_url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Normalize database URL and connect_args to seamlessly support:
    - Local SQLite (sqlite+aiosqlite)
    - Cloud Serverless PostgreSQL like Neon (postgresql+asyncpg)
    - Automatically strips unsupported query parameters (e.g. channel_binding, sslmode)
      that cause asyncpg.connect() to fail.
    """
    url = raw_url.strip()
    connect_args: Dict[str, Any] = {}

    if "sqlite" in url:
        connect_args = {"check_same_thread": False}
        return url, connect_args

    # Adapt Neon / Postgres URLs to asyncpg driver
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    # Check if SSL is required
    query_lower = parsed.query.lower()
    if "ssl" in query_lower or "sslmode" in query_lower or "neon.tech" in parsed.netloc:
        connect_args["ssl"] = "require"

    # Strip query parameters (like sslmode, channel_binding) which asyncpg rejects
    url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        "",
        "",
        ""
    ))

    return url, connect_args

db_url, db_connect_args = resolve_db_url_and_args(settings.DATABASE_URL)

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=db_connect_args,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an AsyncSession and ensures proper cleanup.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()

async def check_database_health() -> bool:
    """
    Execute a lightweight SELECT 1 query to verify database connectivity.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
