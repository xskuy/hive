from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_UNIVERSE_PATH = (
    Path(__file__).resolve().parent.parent
    / "features"
    / "market_sentinel"
    / "data"
    / "sp500_top200.json"
)


class Settings(BaseSettings):
    """Centralized settings for the transactional backend."""

    database_url: str = "postgresql://postgres:postgres@localhost:5433/hive"
    frontend_url: str = "http://localhost:3000"
    tavily_api_key: str = ""
    agents_url: str = "http://localhost:8000"
    market_sentinel_enabled: bool = True
    market_sentinel_universe_path: str = str(DEFAULT_UNIVERSE_PATH)
    market_sentinel_price_move_threshold: float = 2.0
    market_sentinel_volume_ratio_threshold: float = 2.5
    market_sentinel_news_lookback_hours: int = 6
    market_sentinel_max_news_items: int = 3
    market_sentinel_request_timeout_seconds: float = 20.0
    market_sentinel_market_data_provider: Literal["yfinance", "polygon"] = "yfinance"
    market_sentinel_polygon_api_key: str = ""
    market_sentinel_polygon_base_url: str = "https://api.polygon.io"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        """Normalize Postgres URLs so SQLAlchemy uses psycopg v3."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


settings = Settings()
