from functools import lru_cache

from anthropic import AnthropicFoundry
from azure.ai.inference import EmbeddingsClient
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.storage.blob import BlobServiceClient

from config.settings import settings


@lru_cache
def get_chat_client() -> AnthropicFoundry:
    return AnthropicFoundry(
        api_key=settings.AZURE_AI_KEY,
        resource=settings.AZURE_AI_RESOURCE_NAME,
    )


@lru_cache
def get_embeddings_client() -> EmbeddingsClient:
    return EmbeddingsClient(
        endpoint=f"https://{settings.AZURE_AI_RESOURCE_NAME}.services.ai.azure.com/models",
        credential=AzureKeyCredential(settings.AZURE_AI_KEY),
        model=settings.AZURE_AI_EMBEDDING_DEPLOYMENT,
    )


@lru_cache
def get_search_client() -> SearchClient:
    return SearchClient(
        endpoint=settings.AZURE_SEARCH_ENDPOINT,
        index_name=settings.AZURE_SEARCH_INDEX_NAME,
        credential=AzureKeyCredential(settings.AZURE_SEARCH_API_KEY),
    )


@lru_cache
def get_document_analysis_client() -> DocumentAnalysisClient:
    return DocumentAnalysisClient(
        endpoint=settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
        credential=AzureKeyCredential(settings.AZURE_DOCUMENT_INTELLIGENCE_KEY),
    )


@lru_cache
def get_blob_service_client() -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(
        settings.AZURE_STORAGE_CONNECTION_STRING
    )
