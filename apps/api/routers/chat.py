from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from config.settings import settings
from models.chat_models import ChatQueryResponse, ChatRequest
from services.generation_service import generate_answer, generate_answer_streaming
from services.query_service import rewrite_query
from services.reranking_service import rerank_chunks
from services.retrieval_service import embed_query, hybrid_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream a RAG-powered answer as SSE events."""
    t_start = time.perf_counter()

    # 1. Rewrite query + embed in parallel (independent of each other)
    rewrite_task = asyncio.to_thread(
        rewrite_query, request.query, request.conversation_history
    )
    embed_task = asyncio.to_thread(embed_query, request.query)
    rewritten_query, query_vector = await asyncio.gather(rewrite_task, embed_task)
    t_rewrite_embed = time.perf_counter()
    logger.info("[TIMING] rewrite + embed: %.2fs", t_rewrite_embed - t_start)

    # 2. Hybrid search
    chunks = await asyncio.to_thread(
        hybrid_search,
        rewritten_query,
        query_vector,
        request.organization_id,
        settings.SEARCH_TOP_K,
        request.filters.folder_ids or None,
        request.filters.document_names or None,
    )
    t_search = time.perf_counter()
    logger.info("[TIMING] hybrid search: %.2fs (%d chunks)", t_search - t_rewrite_embed, len(chunks))

    # 3. Rerank if enabled (and we have results)
    if chunks and settings.RERANKING_ENABLED:
        chunks = await asyncio.to_thread(
            rerank_chunks, rewritten_query, chunks, request.top_k
        )
        t_rerank = time.perf_counter()
        logger.info("[TIMING] rerank: %.2fs", t_rerank - t_search)
    elif chunks:
        chunks = chunks[: request.top_k]

    t_total = time.perf_counter()
    logger.info("[TIMING] total before streaming: %.2fs", t_total - t_start)

    # 4. Stream the answer (AI handles empty context gracefully)
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

    # 1. Rewrite query using conversation history
    rewritten_query = await asyncio.to_thread(
        rewrite_query, request.query, request.conversation_history
    )
    t_rewrite = time.perf_counter()
    logger.info("[TIMING] rewrite: %.2fs", t_rewrite - t_start)

    # 2. Embed the rewritten query
    query_vector = await asyncio.to_thread(embed_query, rewritten_query)
    t_embed = time.perf_counter()
    logger.info("[TIMING] embed: %.2fs", t_embed - t_rewrite)

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
    t_search = time.perf_counter()
    logger.info("[TIMING] hybrid search: %.2fs (%d chunks)", t_search - t_embed, len(chunks))

    # 3. Rerank if enabled (and we have results)
    if chunks and settings.RERANKING_ENABLED:
        chunks = await asyncio.to_thread(
            rerank_chunks, rewritten_query, chunks, request.top_k
        )
        t_rerank = time.perf_counter()
        logger.info("[TIMING] rerank: %.2fs", t_rerank - t_search)
    elif chunks:
        chunks = chunks[: request.top_k]

    # 4. Generate answer (AI handles empty context gracefully)
    t_before_gen = time.perf_counter()
    answer, citations = await asyncio.to_thread(
        generate_answer, rewritten_query, chunks, request.conversation_history
    )
    t_gen = time.perf_counter()
    logger.info("[TIMING] generation: %.2fs", t_gen - t_before_gen)
    logger.info("[TIMING] total: %.2fs", t_gen - t_start)

    return ChatQueryResponse(
        answer=answer,
        citations=citations,
        query_rewritten=rewritten_query,
    )
