#!/usr/bin/env python3
"""RAG Evaluation Runner

Runs each test question against 2 retrieval configurations (baseline vs semantic
ranker) sequentially, scores responses with an LLM judge (Mistral Large 3),
and saves timestamped results to evaluation/results/.

Usage:
    uv run --project evaluation evaluation/run.py \
        --org-id <organization_id> \
        --folder-id <folder_id> \
        [--api-url http://localhost:4001] \
        [--test-set evaluation/test_set.json] \
        [--delay 3]

The script reads Azure credentials from apps/api/.env (AZURE_AI_RESOURCE_NAME,
AZURE_AI_CHAT_DEPLOYMENT) and authenticates via DefaultAzureCredential (az login).
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.identity import DefaultAzureCredential
from dotenv import dotenv_values

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CONFIGS = [
    ("baseline", {"use_semantic_search": False}),
    ("semantic", {"use_semantic_search": True}),
]

JUDGE_SYSTEM_PROMPT = """You are an evaluation judge for a RAG (Retrieval-Augmented Generation) system.

Given a question, the expected answer, and the system's actual answer, score the response on three metrics (each 0-10):

1. **Faithfulness**: Is every claim in the answer supported by the retrieved context? Does it avoid hallucination? A score of 10 means every statement is grounded.
2. **Relevance**: Does the answer directly address the question? A score of 10 means the answer is perfectly on-topic with no irrelevant information.
3. **Completeness**: Does the answer cover all important aspects present in the expected answer? A score of 10 means nothing important is missing.

Return ONLY valid JSON — no markdown fences, no extra text:
{"faithfulness": <0-10>, "relevance": <0-10>, "completeness": <0-10>, "reasoning": "<brief explanation>"}"""

JUDGE_USER_TEMPLATE = """Question: {question}

Expected answer: {expected_answer}

System's actual answer: {actual_answer}

Retrieved chunks (context the system had available):
{chunks_text}"""

_COGNITIVE_SERVICES_SCOPES = ["https://cognitiveservices.azure.com/.default"]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_env() -> dict:
    """Load environment variables from apps/api/.env."""
    env_path = Path(__file__).resolve().parent.parent / "apps" / "api" / ".env"
    if not env_path.exists():
        print(f"ERROR: {env_path} not found. Run ./scripts/setup.sh first.")
        sys.exit(1)
    return dict(dotenv_values(env_path))


def get_judge_client(env: dict[str, str]) -> ChatCompletionsClient:
    """Create a ChatCompletionsClient for the LLM judge (Mistral Large 3)."""
    resource_name = env.get("AZURE_AI_RESOURCE_NAME", "")
    deployment = env.get("AZURE_AI_CHAT_DEPLOYMENT", "")
    if not resource_name or not deployment:
        print("ERROR: AZURE_AI_RESOURCE_NAME and AZURE_AI_CHAT_DEPLOYMENT must be set in apps/api/.env")
        sys.exit(1)

    return ChatCompletionsClient(
        endpoint=f"https://{resource_name}.services.ai.azure.com/models",
        credential=DefaultAzureCredential(),
        credential_scopes=_COGNITIVE_SERVICES_SCOPES,
        model=deployment,
    )


def format_chunks_for_judge(chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable string for the judge."""
    if not chunks:
        return "(no chunks retrieved)"
    parts = []
    for i, chunk in enumerate(chunks, 1):
        doc = chunk.get("document_name", "unknown")
        page = chunk.get("page_number", "?")
        text = chunk.get("chunk_text", "")[:400]
        parts.append(f"[{i}] {doc} (p.{page}): {text}")
    return "\n\n".join(parts)


def judge_response(
    client: ChatCompletionsClient,
    question: str,
    expected_answer: str,
    actual_answer: str,
    chunks: list[dict],
) -> dict:
    """Score a response using the LLM judge. Returns scores dict."""
    chunks_text = format_chunks_for_judge(chunks)
    user_msg = JUDGE_USER_TEMPLATE.format(
        question=question,
        expected_answer=expected_answer,
        actual_answer=actual_answer,
        chunks_text=chunks_text,
    )

    response = client.complete(
        messages=[
            SystemMessage(content=JUDGE_SYSTEM_PROMPT),
            UserMessage(content=user_msg),
        ],
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown fences if the model wraps in ```json ... ```
    if content.startswith("```"):
        content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        scores = json.loads(content)
    except json.JSONDecodeError:
        print(f"  WARNING: Judge returned invalid JSON: {content[:200]}")
        scores = {"faithfulness": 0, "relevance": 0, "completeness": 0, "reasoning": f"Parse error: {content[:200]}"}

    return scores


def run_question(
    session: requests.Session,
    api_url: str,
    org_id: str,
    folder_id: str,
    question: str,
    config_overrides: dict,
) -> dict:
    """Send a question to the /chat/query endpoint and return the response."""
    payload = {
        "organization_id": org_id,
        "query": question,
        "conversation_history": [],
        "filters": {"folder_ids": [folder_id]} if folder_id else {},
        **config_overrides,
    }

    response = session.post(
        f"{api_url}/api/v1/chat/query",
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    return response.json()


def print_summary(results: list[dict], configs: list[tuple[str, dict]]) -> None:
    """Print a summary comparison table to stdout."""
    # Aggregate scores per config
    config_scores: dict[str, dict[str, list[float]]] = {}
    for cfg_name, _ in configs:
        config_scores[cfg_name] = {
            "faithfulness": [],
            "relevance": [],
            "completeness": [],
            "total_ms": [],
        }

    for result in results:
        for cfg_name in result.get("configs", {}):
            cfg_data = result["configs"][cfg_name]
            scores = cfg_data.get("scores", {})
            config_scores[cfg_name]["faithfulness"].append(scores.get("faithfulness", 0))
            config_scores[cfg_name]["relevance"].append(scores.get("relevance", 0))
            config_scores[cfg_name]["completeness"].append(scores.get("completeness", 0))
            timing = cfg_data.get("timing", {})
            config_scores[cfg_name]["total_ms"].append(timing.get("total_ms", 0))

    def avg(lst: list[float]) -> float:
        return sum(lst) / len(lst) if lst else 0

    # Print table
    print()
    print("=" * 90)
    print(f"{'Config':<16} {'Faithful':>10} {'Relevant':>10} {'Complete':>10} {'Average':>10} {'Latency':>12}")
    print("-" * 90)

    for cfg_name, _ in configs:
        s = config_scores[cfg_name]
        f = avg(s["faithfulness"])
        r = avg(s["relevance"])
        c = avg(s["completeness"])
        a = (f + r + c) / 3
        latency = avg(s["total_ms"])
        print(f"{cfg_name:<16} {f:>10.1f} {r:>10.1f} {c:>10.1f} {a:>10.1f} {latency:>10.0f}ms")

    print("=" * 90)
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="RAG Evaluation Runner")
    parser.add_argument("--org-id", required=True, help="Organization ID")
    parser.add_argument("--folder-id", default="", help="Folder ID to scope retrieval (optional)")
    parser.add_argument("--api-url", default="http://localhost:4001", help="API base URL")
    parser.add_argument("--test-set", default="evaluation/test_set.json", help="Path to test set JSON")
    parser.add_argument("--delay", type=int, default=20, help="Seconds to wait between API calls (rate limit avoidance)")
    args = parser.parse_args()

    # Load test set
    test_set_path = Path(args.test_set)
    if not test_set_path.exists():
        print(f"ERROR: Test set not found at {test_set_path}")
        sys.exit(1)

    with open(test_set_path) as f:
        test_set = json.load(f)

    questions = test_set["questions"]
    print(f"Loaded {len(questions)} questions from {test_set_path}")
    print(f"Running {len(CONFIGS)} configurations x {len(questions)} questions = {len(CONFIGS) * len(questions)} total API calls")
    print(f"Delay between calls: {args.delay}s")
    print()

    # Set up clients
    env = load_env()
    judge_client = get_judge_client(env)
    http_client = requests.Session()

    results = []
    total_calls = len(CONFIGS) * len(questions)
    current_call = 0

    for q_idx, q in enumerate(questions):
        q_id = q["id"]
        question_text = q["question"]
        expected_answer = q["expected_answer"]
        category = q.get("category", "unknown")

        print(f"[{q_idx + 1}/{len(questions)}] {q_id}: {question_text[:80]}...")

        q_result = {
            "question_id": q_id,
            "question": question_text,
            "category": category,
            "expected_answer": expected_answer,
            "configs": {},
        }

        for cfg_name, cfg_overrides in CONFIGS:
            current_call += 1
            print(f"  [{current_call}/{total_calls}] config={cfg_name} ... ", end="", flush=True)

            try:
                # Call the API
                api_response = run_question(
                    http_client, args.api_url, args.org_id, args.folder_id,
                    question_text, cfg_overrides,
                )

                answer = api_response.get("answer", "")
                citations = api_response.get("citations", [])
                timing = api_response.get("timing", {})
                chunks_used = api_response.get("chunks_used", [])
                query_rewritten = api_response.get("query_rewritten", "")

                total_ms = timing.get("total_ms", 0)
                print(f"answer={len(answer)} chars, {total_ms:.0f}ms ... ", end="", flush=True)

                # Judge the response
                scores = judge_response(
                    judge_client, question_text, expected_answer, answer, chunks_used,
                )
                f_score = scores.get("faithfulness", 0)
                r_score = scores.get("relevance", 0)
                c_score = scores.get("completeness", 0)
                print(f"F={f_score} R={r_score} C={c_score}")

                q_result["configs"][cfg_name] = {
                    "answer": answer,
                    "query_rewritten": query_rewritten,
                    "citations": citations,
                    "timing": timing,
                    "chunks_used": chunks_used,
                    "scores": scores,
                }

            except requests.HTTPError as e:
                print(f"HTTP error: {e.response.status_code if e.response else 'unknown'}")
                q_result["configs"][cfg_name] = {"error": str(e)}
            except Exception as e:
                print(f"Error: {e}")
                q_result["configs"][cfg_name] = {"error": str(e)}

            # Rate limit delay (skip after the very last call)
            if current_call < total_calls:
                time.sleep(args.delay)

        results.append(q_result)

    http_client.close()

    # Build summary
    summary = {}
    for cfg_name, _ in CONFIGS:
        scores_lists: dict[str, list[float]] = {"faithfulness": [], "relevance": [], "completeness": [], "total_ms": []}
        for r in results:
            cfg_data = r["configs"].get(cfg_name, {})
            if "error" not in cfg_data:
                s = cfg_data.get("scores", {})
                scores_lists["faithfulness"].append(s.get("faithfulness", 0))
                scores_lists["relevance"].append(s.get("relevance", 0))
                scores_lists["completeness"].append(s.get("completeness", 0))
                scores_lists["total_ms"].append(cfg_data.get("timing", {}).get("total_ms", 0))

        def avg(lst: list[float]) -> float:
            return round(sum(lst) / len(lst), 2) if lst else 0

        summary[cfg_name] = {
            "avg_faithfulness": avg(scores_lists["faithfulness"]),
            "avg_relevance": avg(scores_lists["relevance"]),
            "avg_completeness": avg(scores_lists["completeness"]),
            "avg_total_ms": avg(scores_lists["total_ms"]),
            "num_questions": len(scores_lists["faithfulness"]),
        }

    # Save results
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    results_dir = Path(__file__).resolve().parent / "results"
    results_dir.mkdir(exist_ok=True)
    output_path = results_dir / f"{timestamp}.json"

    output = {
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_url": args.api_url,
            "organization_id": args.org_id,
            "folder_id": args.folder_id,
            "delay_seconds": args.delay,
            "test_set": str(test_set_path),
            "num_questions": len(questions),
            "num_configs": len(CONFIGS),
        },
        "results": results,
        "summary": summary,
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nResults saved to {output_path}")

    # Print summary table
    print_summary(results, CONFIGS)


if __name__ == "__main__":
    main()
