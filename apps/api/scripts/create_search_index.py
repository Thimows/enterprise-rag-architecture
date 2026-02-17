"""Create or update the Azure AI Search index.

Reads credentials from the .env file (same as the FastAPI app).
Idempotent: safe to re-run.

Usage:
    cd apps/api
    uv run python scripts/create_search_index.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SearchableField,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)

from config.settings import settings

INDEX_NAME = settings.AZURE_SEARCH_INDEX_NAME

fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="content", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
    SearchField(
        name="content_vector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=3072,
        vector_search_profile_name="vector-profile",
    ),
    SimpleField(name="document_id", type=SearchFieldDataType.String, filterable=True),
    SearchableField(name="document_name", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="document_url", type=SearchFieldDataType.String, filterable=False),
    SimpleField(name="page_number", type=SearchFieldDataType.Int32, filterable=True, sortable=True),
    SimpleField(name="chunk_index", type=SearchFieldDataType.Int32, filterable=True),
    SimpleField(name="metadata", type=SearchFieldDataType.String, searchable=False),
    SimpleField(name="organization_id", type=SearchFieldDataType.String, filterable=True),
    SimpleField(name="folder_id", type=SearchFieldDataType.String, filterable=True),
]

vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(
            name="hnsw-config",
            parameters={"m": 4, "ef_construction": 400, "ef_search": 500, "metric": "cosine"},
        ),
    ],
    profiles=[
        VectorSearchProfile(name="vector-profile", algorithm_configuration_name="hnsw-config"),
    ],
)

semantic_config = SemanticConfiguration(
    name="semantic-config",
    prioritized_fields=SemanticPrioritizedFields(
        content_fields=[SemanticField(field_name="content")],
        title_field=SemanticField(field_name="document_name"),
    ),
)

semantic_search = SemanticSearch(configurations=[semantic_config])

index = SearchIndex(
    name=INDEX_NAME,
    fields=fields,
    vector_search=vector_search,
    semantic_search=semantic_search,
)

client = SearchIndexClient(
    endpoint=settings.AZURE_SEARCH_ENDPOINT,
    credential=AzureKeyCredential(settings.AZURE_SEARCH_API_KEY),
)

result = client.create_or_update_index(index)
print(f"Index '{result.name}' created/updated successfully.")
print(f"Fields: {[f.name for f in result.fields]}")
