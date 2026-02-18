from __future__ import annotations

import json
import logging
import re
import time
from typing import Generator

logger = logging.getLogger(__name__)

from azure.ai.inference.models import AssistantMessage, SystemMessage, UserMessage

from config.settings import settings
from models.chat_models import Citation, ConversationMessage, SearchChunk
from utils.azure_clients import get_chat_client

SYSTEM_PROMPT = """You are a helpful assistant that answers questions based ONLY on the provided context.

CRITICAL RULES:
1. Only use information from the provided context chunks
2. For every factual claim, include an inline citation: [1], [2], etc.
3. If the context is empty or doesn't contain relevant information, let the user know you couldn't find relevant documents. Suggest they upload documents through the Files page in the sidebar and try again. Do not include any citation references in this case.
4. Never speculate or use external knowledge

Format your response as markdown with inline citations [1][2] after every fact."""


def format_context(chunks: list[SearchChunk]) -> str:
    """Format retrieved chunks into a numbered context string for the LLM."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        header = f"[{i}] Source: {chunk.document_name} (Page {chunk.page_number})"
        parts.append(f"{header}\n{chunk.content}")
    return "\n\n---\n\n".join(parts)


def build_messages(
    query: str,
    chunks: list[SearchChunk],
    conversation_history: list[ConversationMessage],
    max_history_turns: int | None = None,
) -> list:
    """Build the message list for the chat completion request.

    Order: system prompt -> conversation history (capped) -> context + query.
    """
    if max_history_turns is None:
        max_history_turns = settings.MAX_HISTORY_TURNS

    messages: list = [SystemMessage(content=SYSTEM_PROMPT)]

    # Add capped conversation history (each turn = user + assistant = 2 messages)
    capped_history = conversation_history[-(max_history_turns * 2) :]
    for msg in capped_history:
        if msg.role == "user":
            messages.append(UserMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AssistantMessage(content=msg.content))

    # Add context and query as the final user message
    context_text = format_context(chunks)
    final_message = f"Context:\n{context_text}\n\nQuestion: {query}"
    messages.append(UserMessage(content=final_message))

    return messages


def generate_answer_streaming(
    query: str,
    chunks: list[SearchChunk],
    conversation_history: list[ConversationMessage],
) -> Generator[str, None, None]:
    """Generate an answer with streaming, yielding SSE-formatted events."""
    t0 = time.perf_counter()
    client = get_chat_client()
    messages = build_messages(query, chunks, conversation_history)
    t1 = time.perf_counter()
    logger.info("[TIMING] build messages: %.2fs", t1 - t0)

    response = client.complete(messages=messages, stream=True)
    t2 = time.perf_counter()
    logger.info("[TIMING] client.complete() call: %.2fs", t2 - t1)

    full_text = ""
    first_token = True
    for update in response:
        if update.choices and update.choices[0].delta and update.choices[0].delta.content:
            if first_token:
                logger.info("[TIMING] time to first token: %.2fs", time.perf_counter() - t2)
                first_token = False
            content = update.choices[0].delta.content
            full_text += content
            event = json.dumps({"type": "chunk", "content": content})
            yield f"data: {event}\n\n"

    # Extract citations after streaming completes
    citations = extract_citations(full_text, chunks)
    for citation in citations:
        event = json.dumps({
            "type": "citation",
            "number": citation.number,
            "source": {
                "document_id": citation.document_id,
                "document_name": citation.document_name,
                "document_url": citation.document_url,
                "page_number": citation.page_number,
                "chunk_text": citation.chunk_text,
            },
        })
        yield f"data: {event}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


def generate_answer(
    query: str,
    chunks: list[SearchChunk],
    conversation_history: list[ConversationMessage],
) -> tuple[str, list[Citation]]:
    """Generate an answer without streaming (for evaluation)."""
    client = get_chat_client()
    messages = build_messages(query, chunks, conversation_history)

    response = client.complete(messages=messages)
    answer = response.choices[0].message.content

    citations = extract_citations(answer, chunks)
    return answer, citations


def extract_citations(
    text: str,
    chunks: list[SearchChunk],
) -> list[Citation]:
    """Extract citation references [1], [2], etc. from text and map to source chunks."""
    pattern = r"\[(\d+)\]"
    matches = re.findall(pattern, text)
    cited_numbers = sorted(set(int(m) for m in matches))

    citations = []
    for num in cited_numbers:
        idx = num - 1  # 1-indexed to 0-indexed
        if 0 <= idx < len(chunks):
            chunk = chunks[idx]
            citations.append(Citation(
                number=num,
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                document_url=chunk.document_url,
                page_number=chunk.page_number,
                chunk_text=chunk.content,
                relevance_score=chunk.reranker_score or chunk.search_score,
            ))

    return citations
