from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.chat_models import (
    ChatQueryResponse,
    ChatRequest,
    RetrievedChunk,
    TimingBreakdown,
)
from services.generation_service import generate_answer, generate_answer_streaming
from services.query_service import rewrite_query
from services.retrieval_service import embed_query, hybrid_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream a RAG-powered answer as SSE events."""
    t_start = time.perf_counter()

    # 1. Rewrite query (also classifies conversational vs retrieval)
    rewritten_query, is_conversational = await asyncio.to_thread(
        rewrite_query, request.query, request.conversation_history
    )
    t_rewrite = time.perf_counter()
    logger.info("[TIMING] rewrite: %.2fs (conversational=%s)", t_rewrite - t_start, is_conversational)

    # 2. Skip RAG pipeline for conversational messages (thanks, greetings, etc.)
    if is_conversational:
        return StreamingResponse(
            generate_answer_streaming(
                request.query, [], request.conversation_history
            ),
            media_type="text/event-stream",
            headers=SSE_HEADERS,
        )

    # Resolve per-request semantic search override
    use_semantic = request.use_semantic_search if request.use_semantic_search is not None else True

    # 3. Embed + search
    query_vector = await asyncio.to_thread(embed_query, rewritten_query)
    t_embed = time.perf_counter()
    logger.info("[TIMING] embed: %.2fs", t_embed - t_rewrite)

    chunks = await asyncio.to_thread(
        hybrid_search,
        rewritten_query,
        query_vector,
        request.organization_id,
        request.top_k,
        request.filters.folder_ids or None,
        request.filters.document_names or None,
        use_semantic,
    )
    t_search = time.perf_counter()
    logger.info("[TIMING] hybrid search: %.2fs (%d chunks)", t_search - t_embed, len(chunks))

    t_total = time.perf_counter()
    logger.info("[TIMING] total before streaming: %.2fs", t_total - t_start)

    # 5. Stream the answer
    return StreamingResponse(
        generate_answer_streaming(
            rewritten_query, chunks, request.conversation_history
        ),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.post("/query", response_model=ChatQueryResponse)
async def chat_query(request: ChatRequest):
    """Return a RAG-powered answer without streaming (for evaluation)."""
    t_start = time.perf_counter()

    # 1. Rewrite query (also classifies conversational vs retrieval)
    rewritten_query, is_conversational = await asyncio.to_thread(
        rewrite_query, request.query, request.conversation_history
    )
    t_rewrite = time.perf_counter()
    logger.info("[TIMING] rewrite: %.2fs (conversational=%s)", t_rewrite - t_start, is_conversational)

    # Resolve per-request semantic search override
    use_semantic = request.use_semantic_search if request.use_semantic_search is not None else True

    timing = TimingBreakdown(rewrite_ms=round((t_rewrite - t_start) * 1000, 1))

    chunks = []
    if not is_conversational:
        # 2. Embed the rewritten query
        query_vector = await asyncio.to_thread(embed_query, rewritten_query)
        t_embed = time.perf_counter()
        timing.embed_ms = round((t_embed - t_rewrite) * 1000, 1)
        logger.info("[TIMING] embed: %.2fs", t_embed - t_rewrite)

        # 3. Hybrid search (always scoped by organization_id)
        chunks = await asyncio.to_thread(
            hybrid_search,
            rewritten_query,
            query_vector,
            request.organization_id,
            request.top_k,
            request.filters.folder_ids or None,
            request.filters.document_names or None,
            use_semantic,
        )
        t_search = time.perf_counter()
        timing.search_ms = round((t_search - t_embed) * 1000, 1)
        logger.info("[TIMING] hybrid search: %.2fs (%d chunks)", t_search - t_embed, len(chunks))

    # 5. Generate answer
    query_for_gen = request.query if is_conversational else rewritten_query
    t_before_gen = time.perf_counter()
    answer, citations = await asyncio.to_thread(
        generate_answer, query_for_gen, chunks, request.conversation_history
    )
    t_gen = time.perf_counter()
    timing.generation_ms = round((t_gen - t_before_gen) * 1000, 1)
    timing.total_ms = round((t_gen - t_start) * 1000, 1)
    logger.info("[TIMING] generation: %.2fs", t_gen - t_before_gen)
    logger.info("[TIMING] total: %.2fs", t_gen - t_start)

    chunks_used = [
        RetrievedChunk(
            document_name=c.document_name,
            page_number=c.page_number,
            chunk_text=c.content[:500],
            search_score=c.search_score,
            reranker_score=c.reranker_score,
        )
        for c in chunks
    ]

    return ChatQueryResponse(
        answer=answer,
        citations=citations,
        query_rewritten=rewritten_query,
        timing=timing,
        chunks_used=chunks_used,
    )
