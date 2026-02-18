from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    AZURE_AI_ENDPOINT: str = ""
    AZURE_AI_RESOURCE_NAME: str = ""
    AZURE_AI_CHAT_DEPLOYMENT: str = ""
    AZURE_AI_REWRITE_DEPLOYMENT: str = ""
    AZURE_AI_EMBEDDING_DEPLOYMENT: str = ""

    AZURE_SEARCH_ENDPOINT: str = ""
    AZURE_SEARCH_INDEX_NAME: str = "rag-index"

    AZURE_STORAGE_ACCOUNT_NAME: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = "documents"

    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str = ""

    CORS_ORIGINS: list[str] = ["http://localhost:4000"]

    DATABASE_URL: str = ""

    # Databricks
    DATABRICKS_HOST: str = ""
    DATABRICKS_TOKEN: str = ""
    DATABRICKS_JOB_ID: int = 0

    # RAG Pipeline
    RERANKING_ENABLED: bool = True
    MAX_HISTORY_TURNS: int = 10
    SEARCH_TOP_K: int = 50
    CONTEXT_TOP_K: int = 10


settings = Settings()
