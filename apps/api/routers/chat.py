from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from config.settings import settings
from models.chat_models import ChatQueryResponse, ChatRequest
from services.generation_service import generate_answer, generate_answer_streaming
from services.query_service import rewrite_query
from services.reranking_service import rerank_chunks
from services.retrieval_service import embed_query, hybrid_search

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream a RAG-powered answer as SSE events."""
    # 1. Rewrite query using conversation history
    rewritten_query = await asyncio.to_thread(
        rewrite_query, request.query, request.conversation_history
    )

    # 2. Embed the rewritten query
    query_vector = await asyncio.to_thread(embed_query, rewritten_query)

    # 3. Hybrid search (always scoped by organization_id)
    chunks = await asyncio.to_thread(
        hybrid_search,
        rewritten_query,
        query_vector,
        request.organization_id,
        settings.SEARCH_TOP_K,
        request.filters.folder_ids or None,
        request.filters.document_names or None,
    )

    if not chunks:
        return StreamingResponse(
            _no_results_stream(),
            media_type="text/event-stream",
        )

    # 4. Rerank if enabled
    if settings.RERANKING_ENABLED:
        chunks = await asyncio.to_thread(
            rerank_chunks, rewritten_query, chunks, request.top_k
        )
    else:
        chunks = chunks[: request.top_k]

    # 5. Stream the answer
    return StreamingResponse(
        generate_answer_streaming(
            rewritten_query, chunks, request.conversation_history
        ),
        media_type="text/event-stream",
    )


@router.post("/query", response_model=ChatQueryResponse)
async def chat_query(request: ChatRequest):
    """Return a RAG-powered answer without streaming (for evaluation)."""
    # 1. Rewrite query using conversation history
    rewritten_query = await asyncio.to_thread(
        rewrite_query, request.query, request.conversation_history
    )

    # 2. Embed the rewritten query
    query_vector = await asyncio.to_thread(embed_query, rewritten_query)

    # 3. Hybrid search (always scoped by organization_id)
    chunks = await asyncio.to_thread(
        hybrid_search,
        rewritten_query,
        query_vector,
        request.organization_id,
        settings.SEARCH_TOP_K,
        request.filters.folder_ids or None,
        request.filters.document_names or None,
    )

    if not chunks:
        return ChatQueryResponse(
            answer="I couldn't find any relevant documents to answer your question.",
            citations=[],
            query_rewritten=rewritten_query,
        )

    # 4. Rerank if enabled
    if settings.RERANKING_ENABLED:
        chunks = await asyncio.to_thread(
            rerank_chunks, rewritten_query, chunks, request.top_k
        )
    else:
        chunks = chunks[: request.top_k]

    # 5. Generate answer
    answer, citations = await asyncio.to_thread(
        generate_answer, rewritten_query, chunks, request.conversation_history
    )

    return ChatQueryResponse(
        answer=answer,
        citations=citations,
        query_rewritten=rewritten_query,
    )


def _no_results_stream():
    """Yield a 'no results' SSE stream."""
    event = json.dumps({
        "type": "chunk",
        "content": "I couldn't find any relevant documents to answer your question.",
    })
    yield f"data: {event}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"
