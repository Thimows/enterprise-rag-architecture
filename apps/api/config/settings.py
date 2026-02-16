from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    AZURE_AI_ENDPOINT: str = ""
    AZURE_AI_RESOURCE_NAME: str = ""
    AZURE_AI_KEY: str = ""
    AZURE_AI_CHAT_DEPLOYMENT: str = ""
    AZURE_AI_EMBEDDING_DEPLOYMENT: str = ""

    AZURE_SEARCH_ENDPOINT: str = ""
    AZURE_SEARCH_API_KEY: str = ""
    AZURE_SEARCH_INDEX_NAME: str = "rag-index"

    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = "documents"

    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str = ""
    AZURE_DOCUMENT_INTELLIGENCE_KEY: str = ""

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
