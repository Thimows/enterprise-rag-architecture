from __future__ import annotations

import logging
import re

from azure.ai.inference.models import SystemMessage, UserMessage

from config.settings import settings
from models.chat_models import SearchChunk
from utils.azure_clients import get_rewrite_client

logger = logging.getLogger(__name__)

RERANK_SYSTEM_PROMPT = """Rank these chunks by relevance to the query. Return ONLY the chunk numbers as a comma-separated list, most relevant first. Return at most {top_k} numbers.

Example output: 3,1,7,2"""

MAX_CHUNK_CHARS = 300


def rerank_chunks(
    query: str,
    chunks: list[SearchChunk],
    top_k: int | None = None,
) -> list[SearchChunk]:
    """Rerank chunks using GPT-5 Nano.

    Sends all chunks in a single prompt and asks the model to return
    ranked indices as comma-separated numbers. Minimal output tokens for speed.
    """
    if top_k is None:
        top_k = settings.CONTEXT_TOP_K

    if not chunks:
        return []

    client = get_rewrite_client()

    # Build numbered chunk list, truncated for token efficiency
    chunk_lines = []
    for i, chunk in enumerate(chunks):
        text = chunk.content[:MAX_CHUNK_CHARS]
        if len(chunk.content) > MAX_CHUNK_CHARS:
            text += "..."
        chunk_lines.append(f"[{i}] {text}")

    chunks_text = "\n\n".join(chunk_lines)

    messages = [
        SystemMessage(content=RERANK_SYSTEM_PROMPT.format(top_k=top_k)),
        UserMessage(content=f"Query: {query}\n\nChunks:\n{chunks_text}"),
    ]

    response = client.complete(
        messages=messages,
        model_extras={"reasoning_effort": "low"},
    )

    choice = response.choices[0] if response.choices else None
    content = (choice.message.content or "").strip() if choice else ""
    finish_reason = choice.finish_reason if choice else "no_choices"
    logger.info(
        "[RERANK] finish_reason=%s, content_length=%d, raw=%r",
        finish_reason, len(content), content[:200],
    )

    # Extract all integers from the response (robust to any formatting)
    ranked_indices = [int(x) for x in re.findall(r"\d+", content)]

    if not ranked_indices:
        logger.warning("Rerank parse failed, falling back to search order: %s", content)
        return chunks[:top_k]

    # Map indices back to chunks, skipping any out-of-range values
    reranked = []
    seen = set()
    for idx in ranked_indices:
        if 0 <= idx < len(chunks) and idx not in seen:
            reranked.append(chunks[idx])
            seen.add(idx)
        if len(reranked) >= top_k:
            break

    return reranked
