from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    tavily_api_key: str = ""
    moonshot_api_key: str = ""
    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql://postgres:postgres@localhost:5433/hive"
    frontend_url: str = "http://localhost:3000"
    model_name: str = "claude-sonnet-4-6-20250514"
    market_sentinel_model_name: str = "gpt-4.1-nano"

    # LangSmith
    langchain_tracing_v2: bool = True
    langchain_api_key: str = ""
    langchain_project: str = "hive"
    langchain_endpoint: str = "https://api.smith.langchain.com"

    model_config = {"env_file": ".env"}


settings = Settings()
