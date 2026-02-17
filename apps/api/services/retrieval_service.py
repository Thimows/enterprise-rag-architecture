from __future__ import annotations

from azure.search.documents.models import VectorizedQuery, QueryType

from config.settings import settings
from models.chat_models import SearchChunk
from utils.azure_clients import get_embeddings_client, get_search_client


def embed_query(query: str) -> list[float]:
    """Generate embedding vector for a query string."""
    client = get_embeddings_client()
    response = client.embed(input=[query])
    embedding = response.data[0].embedding
    if isinstance(embedding, str):
        raise TypeError("Expected embedding vector, got string")
    return embedding


def hybrid_search(
    query: str,
    query_vector: list[float],
    organization_id: str,
    top_k: int | None = None,
    folder_ids: list[str] | None = None,
    document_names: list[str] | None = None,
) -> list[SearchChunk]:
    """Execute hybrid search (vector + keyword + semantic) against Azure AI Search.

    Always filters by organization_id. Optionally filters by folder_ids and document_names.
    """
    if top_k is None:
        top_k = settings.SEARCH_TOP_K

    client = get_search_client()

    vector_query = VectorizedQuery(
        vector=query_vector,
        k_nearest_neighbors=top_k,
        fields="content_vector",
    )

    # Build OData filter -- organization_id is always required
    filters = [f"organization_id eq '{organization_id}'"]

    if folder_ids:
        folder_conditions = [f"folder_id eq '{fid}'" for fid in folder_ids]
        filters.append(f"({' or '.join(folder_conditions)})")

    if document_names:
        name_conditions = [f"document_name eq '{name}'" for name in document_names]
        filters.append(f"({' or '.join(name_conditions)})")

    filter_expression = " and ".join(filters)

    results = client.search(
        search_text=query,
        vector_queries=[vector_query],
        query_type=QueryType.SEMANTIC,
        semantic_configuration_name="semantic-config",
        top=top_k,
        filter=filter_expression,
        select=[
            "id", "content", "document_id", "document_name",
            "document_url", "page_number", "chunk_index", "metadata",
            "organization_id", "folder_id",
        ],
    )

    chunks = []
    for result in results:
        chunks.append(SearchChunk(
            id=result["id"],
            content=result["content"],
            document_id=result.get("document_id", ""),
            document_name=result.get("document_name", ""),
            document_url=result.get("document_url", ""),
            page_number=result.get("page_number", 0),
            chunk_index=result.get("chunk_index", 0),
            organization_id=result.get("organization_id", ""),
            folder_id=result.get("folder_id", ""),
            metadata=result.get("metadata", ""),
            search_score=result.get("@search.score", 0.0),
            reranker_score=result.get("@search.reranker_score") or 0.0,
        ))

    # Sort by semantic reranker score, fall back to search score
    chunks.sort(
        key=lambda c: (c.reranker_score, c.search_score),
        reverse=True,
    )

    return chunks
