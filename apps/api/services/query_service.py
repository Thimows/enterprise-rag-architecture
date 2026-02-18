from __future__ import annotations

import logging

from azure.ai.inference.models import SystemMessage, UserMessage

from models.chat_models import ConversationMessage
from utils.azure_clients import get_rewrite_client

logger = logging.getLogger(__name__)

REWRITE_SYSTEM_PROMPT = """Classify the user's latest message and, if needed, rewrite it into a standalone search query.

Rules:
1. If the message is conversational (greetings, thanks, acknowledgements, small talk, follow-up questions that don't need documents) — return exactly: NONE
2. If the message is a question that needs document retrieval, rewrite it as a standalone search query using conversation history to resolve references (pronouns, "that", "it", etc.)
3. If the message is already a standalone question, return it as-is
4. Keep rewrites concise — a short search query, not a full sentence

Output ONLY "NONE" or the search query, nothing else."""

CONVERSATIONAL_MARKER = "NONE"


def rewrite_query(
    query: str,
    conversation_history: list[ConversationMessage],
) -> tuple[str, bool]:
    """Rewrite a follow-up query into a standalone query using GPT-5 Nano.

    Returns (rewritten_query, is_conversational).
    When is_conversational is True, the RAG pipeline should be skipped.
    """
    if not conversation_history:
        return query, False

    client = get_rewrite_client()

    # Only include the last few turns for context
    recent = conversation_history[-6:]
    history_text = "\n".join(
        f"{msg.role}: {msg.content[:200]}" for msg in recent
    )

    messages = [
        SystemMessage(content=REWRITE_SYSTEM_PROMPT),
        UserMessage(
            content=f"History:\n{history_text}\n\nLatest message: {query}"
        ),
    ]

    response = client.complete(
        messages=messages,
        model_extras={"max_completion_tokens": 128, "reasoning_effort": "low"},
    )
    content = response.choices[0].message.content
    rewritten = content.strip().strip('"') if content else ""
    logger.info("[REWRITE] input=%r, output=%r", query, rewritten)

    if not rewritten:
        return query, False

    if rewritten.upper() == CONVERSATIONAL_MARKER:
        return query, True

    return rewritten, False
