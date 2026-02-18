from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    role: str
    content: str


class ChatFilters(BaseModel):
    document_names: list[str] = Field(default_factory=list)
    folder_ids: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    organization_id: str
    query: str
    conversation_history: list[ConversationMessage] = Field(default_factory=list)
    filters: ChatFilters = Field(default_factory=ChatFilters)
    top_k: int = 10
    # Per-request override for evaluation — None means use server default (semantic on)
    use_semantic_search: Optional[bool] = None


class SearchChunk(BaseModel):
    """Internal model representing a retrieved chunk from Azure AI Search."""

    id: str
    content: str
    document_id: str
    document_name: str
    document_url: str
    page_number: int
    chunk_index: int
    organization_id: str = ""
    folder_id: str = ""
    metadata: str = ""
    search_score: float = 0.0
    reranker_score: float = 0.0


class CitationSource(BaseModel):
    """Citation payload for SSE events."""

    document_id: str
    document_name: str
    document_url: str
    page_number: int
    chunk_text: str
    relevance_score: float = 0.0
    folder_id: str = ""


class Citation(BaseModel):
    """Citation for non-streaming responses."""

    number: int
    document_id: str
    document_name: str
    document_url: str
    page_number: int
    chunk_text: str
    relevance_score: float = 0.0
    folder_id: str = ""


class TimingBreakdown(BaseModel):
    rewrite_ms: float = 0
    embed_ms: float = 0
    search_ms: float = 0
    generation_ms: float = 0
    total_ms: float = 0


class RetrievedChunk(BaseModel):
    document_name: str
    page_number: int
    chunk_text: str
    search_score: float = 0.0
    reranker_score: float = 0.0


class ChatQueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    query_rewritten: str
    timing: Optional[TimingBreakdown] = None
    chunks_used: list[RetrievedChunk] = Field(default_factory=list)
