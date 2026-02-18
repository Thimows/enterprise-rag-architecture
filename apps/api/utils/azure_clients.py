from functools import lru_cache

from azure.ai.inference import ChatCompletionsClient, EmbeddingsClient
from azure.search.documents import SearchClient
from azure.identity import DefaultAzureCredential
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.storage.blob import BlobServiceClient

from config.settings import settings

_COGNITIVE_SERVICES_SCOPES = ["https://cognitiveservices.azure.com/.default"]


@lru_cache
def get_credential() -> DefaultAzureCredential:
    return DefaultAzureCredential()


@lru_cache
def get_chat_client() -> ChatCompletionsClient:
    return ChatCompletionsClient(
        endpoint=f"https://{settings.AZURE_AI_RESOURCE_NAME}.services.ai.azure.com/models",
        credential=get_credential(),
        credential_scopes=_COGNITIVE_SERVICES_SCOPES,
        model=settings.AZURE_AI_CHAT_DEPLOYMENT,
    )


@lru_cache
def get_rewrite_client() -> ChatCompletionsClient:
    return ChatCompletionsClient(
        endpoint=f"https://{settings.AZURE_AI_RESOURCE_NAME}.services.ai.azure.com/models",
        credential=get_credential(),
        credential_scopes=_COGNITIVE_SERVICES_SCOPES,
        model=settings.AZURE_AI_REWRITE_DEPLOYMENT,
    )


@lru_cache
def get_embeddings_client() -> EmbeddingsClient:
    return EmbeddingsClient(
        endpoint=f"https://{settings.AZURE_AI_RESOURCE_NAME}.services.ai.azure.com/models",
        credential=get_credential(),
        credential_scopes=_COGNITIVE_SERVICES_SCOPES,
        model=settings.AZURE_AI_EMBEDDING_DEPLOYMENT,
    )


@lru_cache
def get_search_client() -> SearchClient:
    return SearchClient(
        endpoint=settings.AZURE_SEARCH_ENDPOINT,
        index_name=settings.AZURE_SEARCH_INDEX_NAME,
        credential=get_credential(),
    )


@lru_cache
def get_document_analysis_client() -> DocumentAnalysisClient:
    return DocumentAnalysisClient(
        endpoint=settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
        credential=get_credential(),
    )


@lru_cache
def get_blob_service_client() -> BlobServiceClient:
    return BlobServiceClient(
        account_url=f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net",
        credential=get_credential(),
    )
