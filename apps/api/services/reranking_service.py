from __future__ import annotations

from functools import lru_cache

from config.settings import settings
from models.chat_models import SearchChunk


@lru_cache
def _get_cross_encoder():
    """Lazy-load the cross-encoder model on first call."""
    from sentence_transformers import CrossEncoder

    return CrossEncoder(settings.RERANKING_MODEL)


def rerank_chunks(
    query: str,
    chunks: list[SearchChunk],
    top_k: int | None = None,
) -> list[SearchChunk]:
    """Rerank chunks using a cross-encoder model.

    Scores each query-chunk pair and returns the top_k most relevant.
    """
    if top_k is None:
        top_k = settings.CONTEXT_TOP_K

    if not chunks:
        return []

    model = _get_cross_encoder()
    pairs = [(query, chunk.content) for chunk in chunks]
    scores = model.predict(pairs)

    scored_chunks = list(zip(chunks, scores))
    scored_chunks.sort(key=lambda x: x[1], reverse=True)

    return [chunk for chunk, _ in scored_chunks[:top_k]]
