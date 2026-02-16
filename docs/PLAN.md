# Enterprise RAG Architecture

> A production-grade, enterprise-ready Retrieval-Augmented Generation (RAG) system showcasing best practices for building transparent, citation-based AI applications with Azure AI Foundry (Claude Sonnet 4.5), Azure AI Search, and Databricks.

## Purpose

This project demonstrates a **complete, production-ready RAG pipeline** designed for enterprise environments where:

- **Data privacy** is paramount — all data stays within your Azure tenant
- **Answer transparency** is required — citations with exact source highlighting
- **Quality assurance** is measurable — custom LLM-as-judge evaluation
- **Scalability** is built-in — Databricks for batch processing, Azure AI Search for retrieval
- **Developer experience** is optimized — Turborepo monorepo, hot reload, type safety

Unlike framework-heavy implementations, this showcase uses **direct SDK integration** with Azure services to provide maximum control, transparency, and performance.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Implementation Roadmap](#implementation-roadmap)
- [Folder Structure](#folder-structure)
- [API Design](#api-design)
- [Security Considerations](#security-considerations)
- [Evaluation Strategy](#evaluation-strategy)
- [Getting Started](#getting-started)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INGESTION PIPELINE                             │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Documents    │───▶│  Databricks  │───▶│   Azure AI   │              │
│  │  (PDF/Word)   │    │    Jobs      │    │    Search    │              │
│  │              │    │              │    │   (Index)    │              │
│  │   Storage    │    │  • Parse     │    │              │              │
│  │   Account    │    │  • Chunk     │    │  • Vector    │              │
│  └──────────────┘    │  • Embed     │    │  • Keyword   │              │
│                      │  • Metadata  │    │  • Semantic  │              │
│                      └──────────────┘    └──────────────┘              │
│                             │                                           │
│                             ▼                                           │
│                      Azure Document Intelligence                        │
│                      Azure AI Foundry (Embeddings)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        RETRIEVAL & GENERATION                           │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Next.js    │───▶│   FastAPI    │───▶│   Azure AI   │              │
│  │   Frontend   │    │   Backend    │    │    Search    │              │
│  │              │    │              │    │              │              │
│  │  • Chat UI   │◀───│  • Query     │◀───│  • Hybrid    │              │
│  │  • Streaming │    │    Rewrite   │    │    Search    │              │
│  │  • Citations │    │  • Rerank    │    │  • Vector +  │              │
│  │  • Sources   │    │  • Generate  │    │    Keyword   │              │
│  └──────────────┘    │              │    └──────────────┘              │
│                      │ Cross-Encoder│                                   │
│                      │Azure AI Fndry│                                   │
│                      └──────────────┘                                   │
│                             │                                           │
│                             ▼                                           │
│                      Vercel Streamdown                                  │
│                      (Markdown Streaming)                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        EVALUATION PIPELINE                              │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Test Set   │───▶│   FastAPI    │───▶│Azure AI Fndry│              │
│  │              │    │   Evaluator  │    │(LLM-as-Judge)│              │
│  │  • Questions │    │              │    │              │              │
│  │  • Expected  │    │ • Faithfuln. │    │  • Grading   │              │
│  │    Answers   │    │ • Relevance  │    │  • Reasoning │              │
│  └──────────────┘    │ • Completen. │    └──────────────┘              │
│                      └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Databricks Jobs** | Batch document ingestion, parsing (Document Intelligence), chunking strategies, embedding generation, quality checks |
| **Azure AI Search** | Vector + keyword + semantic hybrid search, filtering, index management |
| **FastAPI Backend** | Query understanding, retrieval orchestration, cross-encoder reranking, answer generation with citations, streaming responses |
| **Next.js Frontend** | Chat interface, markdown streaming (Streamdown), citation bubbles, source highlighting, document viewer |
| **Azure AI Foundry** | Chat completions (Claude Sonnet 4.5), text embeddings (`text-embedding-3-large`), evaluation (LLM-as-judge) |
| **Terraform** | Infrastructure provisioning, resource management, reproducible deployments |

---

## Tech Stack

### Frontend

| Technology | Version | Justification |
|------------|---------|---------------|
| **Next.js** | 16.x (App Router) | React framework with SSR, streaming, and API routes |
| **React** | 19.x | Concurrent features for streaming UI updates |
| **TypeScript** | 5.9.x | Type safety across frontend and API contracts |
| **Vercel Streamdown** | Latest | Purpose-built for streaming markdown from API to React |
| **Tailwind CSS** | 4.x | Utility-first CSS for rapid UI development |

### Backend

| Technology | Version | Justification |
|------------|---------|---------------|
| **FastAPI** | 0.128+ | High-performance async Python framework with OpenAPI docs |
| **Python** | 3.9+ | Azure SDK compatibility, async/await |
| **UV** | Latest | Fast Python package manager |
| **Anthropic SDK** | Latest | Claude Sonnet 4.5 via Azure AI Foundry |
| **Azure AI Inference SDK** | Latest | Embeddings via Azure AI Foundry |
| **Azure AI Search SDK** | Latest | Direct SDK for hybrid search |
| **Sentence Transformers** | Latest | Cross-encoder models for reranking |
| **Pydantic** | 2.x | Data validation, settings management |

### Ingestion Pipeline

| Technology | Version | Justification |
|------------|---------|---------------|
| **Databricks** | Runtime 13.3+ | Scalable batch processing, scheduled jobs |
| **Databricks Asset Bundles** | Latest | Declarative job deployment |
| **Azure Document Intelligence** | Latest | Advanced PDF/Word parsing with layout analysis |

### Infrastructure

| Technology | Version | Justification |
|------------|---------|---------------|
| **Terraform** | 1.7+ | Infrastructure-as-code for Azure resources |
| **Azure AI Foundry** | Claude Sonnet 4.5, text-embedding-3-large | Chat and embedding models via AI Foundry marketplace |
| **Azure AI Search** | Standard tier | Vector + keyword + semantic ranking |
| **Azure Document Intelligence** | Standard | Document parsing with layout analysis |
| **Azure Storage Account** | Standard | Document storage |

### Development

| Technology | Version | Justification |
|------------|---------|---------------|
| **Turborepo** | 2.8+ | Monorepo build system with intelligent caching |
| **npm workspaces** | Node 18+ | Native monorepo dependency management |
| **ESLint** | 9.x | Linting with flat config |
| **Prettier** | 3.x | Code formatting |

---

## System Components

### 1. Databricks Ingestion Pipeline

**Location**: `databricks/`

The ingestion pipeline runs as Databricks Jobs, defined via Databricks Asset Bundles for declarative, version-controlled deployment.

**Pipeline Steps**:

1. **Document Parsing** (`01_document_parsing.py`) — Parse PDFs/Word docs via Azure Document Intelligence, extract text, layout, and metadata
2. **Chunking** (`02_chunking.py`) — Apply chunking strategies with overlap and metadata preservation
3. **Embedding Generation** (`03_embedding_generation.py`) — Batch embed chunks using Azure AI Foundry `text-embedding-3-large`
4. **Indexing** (`04_indexing.py`) — Upload chunks + embeddings to Azure AI Search index

**Chunking Strategies**:

```python
# Semantic chunking — preserve sentence boundaries
semantic_chunks = semantic_chunker(text, max_tokens=512, overlap_tokens=50)

# Structure-aware — respect document hierarchy (headers, sections)
structured_chunks = structure_aware_chunker(text, layout_data, max_tokens=512)

# Sliding window — fixed-size with overlap
sliding_chunks = sliding_window_chunker(text, window_size=512, overlap=50)
```

**DAB Configuration** (`databricks.yml`):

```yaml
bundle:
  name: rag-ingestion

resources:
  jobs:
    document_ingestion_job:
      name: "[${bundle.target}] Document Ingestion"
      job_clusters:
        - job_cluster_key: main_cluster
          new_cluster:
            spark_version: 13.3.x-scala2.12
            node_type_id: Standard_DS3_v2
            num_workers: 2
      tasks:
        - task_key: parse_documents
          notebook_task:
            notebook_path: ./notebooks/01_document_parsing.py
        - task_key: chunk_and_embed
          depends_on:
            - task_key: parse_documents
          notebook_task:
            notebook_path: ./notebooks/02_chunking.py
```

---

### 2. Azure AI Search Index

**Search Configuration**:
- **Vector Search**: HNSW algorithm with cosine similarity (3072 dimensions)
- **Keyword Search**: Microsoft English analyzer with stemming
- **Semantic Ranking**: Azure L2 semantic ranker for result reordering
- **Hybrid Search**: Combines vector, keyword, and semantic scores with RRF (Reciprocal Rank Fusion)

**Index Schema**:

```json
{
  "name": "documents-index",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "content", "type": "Edm.String", "searchable": true, "analyzer": "en.microsoft" },
    { "name": "content_vector", "type": "Collection(Edm.Single)", "searchable": true, "vectorSearchDimensions": 3072 },
    { "name": "document_id", "type": "Edm.String", "filterable": true },
    { "name": "document_name", "type": "Edm.String", "filterable": true, "facetable": true },
    { "name": "document_url", "type": "Edm.String", "filterable": false },
    { "name": "page_number", "type": "Edm.Int32", "filterable": true, "sortable": true },
    { "name": "chunk_index", "type": "Edm.Int32", "filterable": true },
    { "name": "metadata", "type": "Edm.String", "searchable": false }
  ],
  "vectorSearch": {
    "profiles": [{ "name": "vector-profile", "algorithm": "hnsw-config" }],
    "algorithms": [{
      "name": "hnsw-config",
      "kind": "hnsw",
      "hnswParameters": { "m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine" }
    }]
  },
  "semanticSearch": {
    "configurations": [{
      "name": "semantic-config",
      "prioritizedFields": {
        "contentFields": [{ "fieldName": "content" }],
        "titleField": { "fieldName": "document_name" }
      }
    }]
  }
}
```

---

### 3. FastAPI Backend

**Location**: `apps/api/`

**Core API Flow**:

```python
@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    # 1. Query understanding and rewriting
    optimized_query = await rewrite_query(
        query=request.query,
        conversation_history=request.history
    )

    # 2. Hybrid retrieval from Azure AI Search
    search_results = await hybrid_search(
        query=optimized_query,
        top_k=50,
        filters=request.filters
    )

    # 3. Rerank (optional — cross-encoder vs Azure semantic ranking)
    if settings.RERANKING_ENABLED:
        reranked_chunks = await rerank_chunks(
            query=optimized_query,
            chunks=search_results,
            top_k=10
        )
    else:
        reranked_chunks = search_results[:10]

    # 4. Generate answer with citations (streaming)
    return StreamingResponse(
        generate_answer_stream(
            query=request.query,
            chunks=reranked_chunks,
            instructions=SYSTEM_PROMPT
        ),
        media_type="text/event-stream"
    )
```

**System Prompt for Citations**:

```
You are a helpful assistant that answers questions based ONLY on the provided context.

CRITICAL RULES:
1. Only use information from the provided context chunks
2. For every factual claim, include an inline citation: [1], [2], etc.
3. If the context doesn't contain enough information, say so
4. Never speculate or use external knowledge

Format your response as markdown with inline citations [1][2] after every fact.
```

---

### 4. Next.js Frontend

**Location**: `apps/web/`

Key components:

- **ChatInterface** — Main chat component with message list and input
- **StreamingMessage** — Real-time markdown rendering via Vercel Streamdown
- **CitationBubble** — Inline `[1]` `[2]` bubbles with two interaction modes:
  - **Hover**: Highlight the cited text in the sources pane + show a tooltip with source name, page number, and chunk preview
  - **Click**: Open the artifact panel from the right with the full document viewer, scrolled to the correct page, with the cited passage highlighted
- **SourcesPane** — Below the answer showing source chunks with document name and page number
- **ArtifactPanel** — Slide-in panel from the right, opens on citation click. Contains the document viewer with the original PDF rendered, navigated to the relevant page, with the cited text highlighted using fuzzy text matching against the chunk content
- **DocumentViewer** — PDF viewer (PDF.js) with highlight overlay. Uses fuzzy text matching of the chunk content against the rendered page text to locate and highlight the exact passage

**Citation Interaction Flow**:
```
 Hover [1] bubble
    → Highlight chunk text in sources pane
    → Show tooltip: "Safety Manual 2024.pdf · Page 15"

 Click [1] bubble
    → Open artifact panel (slide-in from right)
    → Load PDF in document viewer
    → Navigate to page 15
    → Fuzzy match chunk text on page → highlight passage
```

---

## Data Flow

### Query Flow (End-to-End)

```
 User types question
        │
        ▼
 1. QUERY REWRITING (FastAPI)
    Analyze history, resolve pronouns, expand abbreviations
        │
        ▼
 2. EMBEDDING GENERATION
    Azure AI Foundry text-embedding-3-large → 3072-dim vector
        │
        ▼
 3. HYBRID SEARCH (Azure AI Search)
    Vector search (cosine) + Keyword search (BM25) + Semantic ranking
    RRF fusion → Top 50 chunks
        │
        ▼
 4. RERANKING (optional, toggleable)
    Azure semantic ranking is the default reranker.
    Optional cross-encoder reranking for benchmarking against Azure's built-in ranking.
    Score each query-chunk pair → Top 10 most relevant
        │
        ▼
 5. CONTEXT PREPARATION
    Format chunks with [1], [2], ... identifiers + metadata
        │
        ▼
 6. ANSWER GENERATION (Azure AI Foundry — Claude Sonnet 4.5)
    Stream response with inline citations [1][2]
        │
        ▼
 7. STREAMING TO FRONTEND (Vercel Streamdown)
    Server-sent events, incremental markdown rendering
        │
        ▼
 8. UI RENDERING (Next.js)
    Citation bubbles + sources pane + document highlight
```

### Ingestion Flow

```
 Document uploaded to Azure Storage
        │
        ▼
 1. DOCUMENT PARSING (Databricks + Document Intelligence)
    Extract text, layout, headers, tables, page numbers
        │
        ▼
 2. CHUNKING (Databricks)
    Semantic chunking with overlap, metadata per chunk
        │
        ▼
 3. EMBEDDING GENERATION (Azure AI Foundry)
    Batch process (100 at a time), validate dimensions
        │
        ▼
 4. QUALITY CHECKS
    Verify chunk sizes, check for empty embeddings, validate metadata
        │
        ▼
 5. INDEXING (Azure AI Search)
    Batch upload → vector index (HNSW) + keyword index + semantic ranking
```

---

## Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETE

**Goal**: Infrastructure, project scaffold, basic integrations

| Task | Status | Details |
|------|--------|---------|
| Terraform IaC | ✅ Done | Resource group, Azure AI Foundry (Claude Sonnet 4.5 + embeddings), Azure AI Search, Document Intelligence, Storage Account — modular setup in `terraform/` with 4 modules |
| Monorepo setup | ✅ Done | `apps/api/package.json` added with `dev` script so `npm run dev` starts both Next.js and FastAPI concurrently via Turborepo |
| FastAPI scaffold | ✅ Done | App entry with CORS, Pydantic settings, Azure SDK client factories, routers (health, chat, documents) under `/api/v1`, `.env.example` |
| Next.js scaffold | ✅ Done | Tailwind CSS v4 with `@tailwindcss/postcss`, chat layout skeleton with header/message area/input bar, dark mode support, `.env.example` |

**Deliverables**: All Azure resources defined in Terraform, `npm run dev` starts both apps, `/api/v1/health` endpoint returns `{"status": "healthy"}`, basic chat UI shell at `localhost:3000`

---

### Phase 1.5: Provision Infrastructure

**Goal**: Actually run Terraform and Databricks deployments so Azure resources and Databricks jobs exist

| Task | Details |
|------|---------|
| Provision Azure resources | `cd terraform && cp terraform.tfvars.example terraform.tfvars` → edit with your subscription/config → `terraform init && terraform apply` |
| Configure `.env` files | Copy Terraform outputs into `apps/api/.env` and `apps/web/.env.local` |
| Create Databricks secrets scope | `databricks secrets create-scope rag-ingestion` → populate secrets from Terraform outputs |
| Deploy Databricks bundle | `cd databricks && databricks bundle deploy --target dev` |
| Verify | Azure Portal shows all resources, Databricks workspace has the ingestion jobs |

> **Note**: This step requires an Azure subscription and Databricks workspace. Skip until you're ready to test end-to-end.

**Deliverables**: Live Azure resources (AI Foundry, AI Search, Storage, Document Intelligence), Databricks jobs deployed and ready to run

---

### Phase 2: Ingestion Pipeline ✅ COMPLETE

**Goal**: Databricks pipeline for document processing

| Task | Status | Details |
|------|--------|---------|
| Databricks utilities | ✅ Done | Client factories using `dbutils.secrets`, chunking strategies (semantic, structure-aware, sliding window with tiktoken), quality validation checks in `databricks/utils/` |
| Document parsing notebook | ✅ Done | `01_document_parsing.py` — Azure Document Intelligence `prebuilt-layout`, PDF/DOCX/TXT support, Delta table `rag_ingestion.parsed_documents` |
| Chunking notebook | ✅ Done | `02_chunking.py` — Widget-selectable strategy, deterministic chunk IDs, quality validation, Delta table `rag_ingestion.chunks` |
| Embedding generation notebook | ✅ Done | `03_embedding_generation.py` — Azure AI Foundry EmbeddingsClient, batch of 100, exponential backoff retry, 3072-dim validation, Delta table `rag_ingestion.chunks_with_embeddings` |
| Azure AI Search index setup | ✅ Done | `00_create_search_index.py` — 9 fields, HNSW vector search (cosine, 3072-dim), semantic ranking config, idempotent `create_or_update_index` |
| Search indexing notebook | ✅ Done | `04_indexing.py` — Batch upsert via `merge_or_upload_documents`, per-document error tracking |
| Databricks Asset Bundles | ✅ Done | `databricks.yml` with 2 jobs, 4 sequential tasks with dependencies, 3 targets (dev/staging/prod) with cluster overrides |
| Document upload API | ✅ Done | `POST /documents/upload` (PDF/DOCX/TXT, 50MB max, Blob Storage), `GET /documents` (list blobs), Pydantic models in `document_models.py` |
| Bug fixes | ✅ Done | Fixed `get_document_analysis_client` credentials, added missing settings fields, updated `.env.example` |

**Deliverables**: End-to-end ingestion job, sample documents indexed and searchable

---

### Phase 3: Retrieval + Generation

**Goal**: Retrieval and answer generation in FastAPI

| Task | Details |
|------|---------|
| Query rewriting | Conversational rewriting with Claude Sonnet 4.5, follow-up handling |
| Hybrid search | Azure AI Search SDK, vector + keyword + semantic, RRF fusion, filtering |
| Reranking (optional) | Sentence Transformers cross-encoder (`ms-marco-MiniLM-L-12-v2`) — toggleable via config, benchmarked against Azure semantic ranking |
| Answer generation | Claude Sonnet 4.5 streaming, system prompt with citation instructions, SSE |
| Citation extraction | Parse `[1]` `[2]` from output, map to source chunks |
| API endpoints | `/chat/stream`, `/chat/query`, `/documents`, `/documents/{id}/chunks` |

**Deliverables**: Working chat endpoint with retrieval, generation, and inline citations

---

### Phase 4: Frontend

**Goal**: Chat interface with streaming and citations

| Task | Details |
|------|---------|
| Chat interface | ChatInterface, MessageList, MessageInput, auto-scroll, loading states |
| Streaming | Vercel Streamdown integration, SSE from FastAPI, incremental markdown |
| Citation bubbles | Parse `[1]` from markdown, render inline bubbles. **Hover**: highlight chunk in sources pane + show tooltip (source name, page). **Click**: open artifact panel |
| Sources pane | Below answer showing source chunks with document name, page number. Highlights active chunk on citation hover |
| Artifact panel | Slide-in panel from right on citation click. Contains DocumentViewer loaded to the correct page with cited passage highlighted |
| Document viewer | PDF.js integration with highlight overlay. Fuzzy match chunk text against rendered page text to locate and highlight the cited passage |
| Fuzzy text matching | Match chunk text against PDF.js text layer on the target page to find exact highlight position. Works uniformly across PDF, Word, and TXT |
| UI polish | Responsive design, dark mode, streaming animations, error states, smooth panel transitions |

**Deliverables**: Fully functional chat with real-time streaming, citation hover tooltips, sources pane, and artifact panel with PDF viewer + text highlighting

---

### Phase 5: Advanced Features

**Goal**: Evaluation, quality improvements

| Task | Details |
|------|---------|
| LLM-as-judge evaluation | 3 metrics (faithfulness, relevance, completeness), grading prompts via Claude, test set (10-20 questions) |
| Reranking benchmark | Compare Azure semantic ranking vs cross-encoder reranking on eval metrics — measure faithfulness/relevance delta to justify the added complexity |
| Query understanding | Intent classification, answerability detection |
| Answer quality | Confidence scoring, table generation when appropriate |
| Conversation memory | Session history, load previous sessions (optional) |

**Deliverables**: Evaluation pipeline with scores, enhanced query understanding

---

### Phase 6: Polish & Documentation

**Goal**: Security, docs, demo readiness

| Task | Details |
|------|---------|
| Security review | No data leaves tenant, disable logging if needed, RBAC, rate limiting, input sanitization |
| Documentation | README (3-5 setup steps), OpenAPI docs, architecture diagrams |
| Demo preparation | Sample documents, demo script, example questions |
| Testing | Unit tests (services), integration tests (API), E2E (chat flow) |
| CI/CD (optional) | GitHub Actions for lint/test, Terraform deploy, Databricks deploy |

**Deliverables**: Production-ready codebase, comprehensive docs, demo-ready

---

## Folder Structure

```
enterprise-rag-architecture/
├── apps/
│   ├── api/                          # FastAPI backend
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── pyproject.toml
│   │   ├── routers/
│   │   │   ├── chat.py               # Chat endpoints (streaming + non-streaming)
│   │   │   ├── documents.py          # Document upload/management
│   │   │   └── evaluation.py         # Evaluation endpoints
│   │   ├── services/
│   │   │   ├── retrieval_service.py  # Azure AI Search integration
│   │   │   ├── reranking_service.py  # Cross-encoder reranking
│   │   │   ├── generation_service.py # Claude Sonnet 4.5 chat completions
│   │   │   ├── query_service.py      # Query rewriting
│   │   │   └── evaluation_service.py # LLM-as-judge evaluation
│   │   ├── models/
│   │   │   ├── chat_models.py
│   │   │   ├── document_models.py
│   │   │   └── evaluation_models.py
│   │   ├── config/
│   │   │   └── settings.py           # Pydantic settings
│   │   └── utils/
│   │       ├── azure_clients.py      # Azure SDK client init
│   │       ├── streaming.py          # SSE streaming utilities
│   │       └── citation_parser.py    # Citation extraction
│   │
│   └── web/                          # Next.js frontend
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx              # Chat interface
│       │   └── chat/
│       │       └── [sessionId]/page.tsx
│       ├── components/
│       │   ├── chat/
│       │   │   ├── ChatInterface.tsx
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageInput.tsx
│       │   │   └── StreamingMessage.tsx
│       │   ├── citations/
│       │   │   ├── CitationBubble.tsx
│       │   │   ├── CitationTooltip.tsx
│       │   │   └── SourcesPane.tsx
│       │   ├── artifact/
│       │   │   ├── ArtifactPanel.tsx     # Slide-in panel from right
│       │   │   ├── DocumentViewer.tsx    # PDF.js viewer
│       │   │   └── HighlightLayer.tsx    # Text highlight overlay
│       │   └── layout/
│       │       ├── Header.tsx
│       │       └── Sidebar.tsx
│       ├── hooks/
│       │   ├── useStreamingChat.ts
│       │   ├── useCitations.ts
│       │   ├── useArtifactPanel.ts       # Panel open/close state
│       │   └── useFuzzyHighlight.ts      # Fuzzy match chunk text on PDF page
│       └── lib/
│           ├── api-client.ts
│           ├── markdown-parser.ts
│           └── fuzzy-match.ts            # Text matching for highlight positioning
│
├── packages/
│   ├── ui/                           # Shared UI components
│   ├── eslint-config/                # Shared ESLint config
│   └── typescript-config/            # Shared TS config
│
├── databricks/
│   ├── databricks.yml                # Databricks Asset Bundles config
│   ├── notebooks/
│   │   ├── 01_document_parsing.py
│   │   ├── 02_chunking.py
│   │   ├── 03_embedding_generation.py
│   │   └── 04_indexing.py
│   ├── utils/
│   │   ├── chunking_strategies.py
│   │   ├── azure_clients.py
│   │   └── quality_checks.py
│   └── config/
│       └── dev.yml
│
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── provider.tf
│   ├── modules/
│   │   ├── ai-foundry/
│   │   ├── azure-search/
│   │   ├── storage/
│   │   └── document-intelligence/
│   └── terraform.tfvars.example
│
├── evaluation/
│   ├── test_set.json                 # Evaluation questions + expected answers
│   ├── run_evaluation.py
│   └── results/
│
├── docs/
│   └── PLAN.md                       # This file
│
├── turbo.json
├── package.json
└── README.md
```

---

## API Design

### `POST /api/v1/chat/stream`

Streaming chat with citations via Server-Sent Events.

**Request**:
```json
{
  "query": "What are the safety requirements for chemical storage?",
  "conversation_history": [
    { "role": "user", "content": "Tell me about warehouse safety." },
    { "role": "assistant", "content": "Warehouse safety includes..." }
  ],
  "filters": { "document_names": ["Safety Manual 2024.pdf"] },
  "top_k": 10
}
```

**Response** (SSE):
```
data: {"type": "chunk", "content": "According to OSHA regulations"}
data: {"type": "chunk", "content": " [1], chemical storage requires"}
data: {"type": "citation", "number": 1, "source": {"document_id": "doc_abc123", "document_name": "Safety Manual 2024.pdf", "document_url": "/documents/doc_abc123", "page_number": 15, "chunk_text": "Chemical storage must have adequate ventilation..."}}
data: {"type": "done"}
```

### `POST /api/v1/chat/query`

Non-streaming query (used for evaluation).

**Response**:
```json
{
  "answer": "According to OSHA regulations [1], chemical storage requires...",
  "citations": [{
    "number": 1,
    "document_id": "doc_abc123",
    "document_name": "Safety Manual 2024.pdf",
    "document_url": "/documents/doc_abc123",
    "page_number": 15,
    "chunk_text": "Chemical storage must have adequate ventilation...",
    "relevance_score": 0.95
  }],
  "query_rewritten": "What are the OSHA safety requirements for chemical storage?"
}
```

### `POST /api/v1/documents/upload`

Upload document for ingestion (multipart form data).

**Response**:
```json
{
  "document_id": "doc_abc123",
  "status": "processing",
  "message": "Document uploaded. Ingestion job started."
}
```

### `GET /api/v1/documents`

List all indexed documents.

### `POST /api/v1/evaluation/run`

Run evaluation pipeline with LLM-as-judge.

### `GET /api/v1/evaluation/{evaluation_id}`

Get evaluation results with per-question scores and reasoning.

---

## Security Considerations

Designed for secure enterprise environments. All documents and queries remain within a private Azure tenant. No data is sent to public AI services.

### Data Sovereignty
- All data remains in your Azure tenant
- Direct Azure SDK integration — no data sent to external services
- Private endpoints for Azure service communication (optional, Terraform-configured)

### Access Control
- **RBAC**: Azure service principals with least-privilege access
- **Managed Identities**: FastAPI and Databricks authenticate without stored credentials
- **API Authentication**: Endpoints protected with API keys or Azure AD OAuth2

### Encryption
- **At rest**: Azure-managed keys (or customer-managed keys)
- **In transit**: HTTPS/TLS 1.2+

### Monitoring & Auditing
- Azure Monitor for centralized logging
- No PII in logs — sanitize queries before logging
- Audit trails for document uploads, index updates, access patterns

### Input Validation
- Pydantic model validation on all API inputs
- Query sanitization
- File upload restrictions (PDF, Word, TXT; max 50MB)

---

## Evaluation Strategy

### Custom LLM-as-Judge

A custom evaluation pipeline using Claude Sonnet 4.5 as a judge, providing full control over metrics, prompts, and scoring.

### Metrics

| Metric | Definition |
|--------|-----------|
| **Faithfulness** | Does the answer only use information from the provided context? (hallucination detection) |
| **Relevance** | Does the answer address the question? |
| **Completeness** | Does the answer cover all aspects of the question? |

Each metric is scored 0-10 by Claude Sonnet 4.5 with a grading prompt and reasoning.

### Test Set

10-20 questions covering:
- **Factual lookup**: Direct answers from a single source
- **Multi-hop reasoning**: Combining information from multiple chunks
- **Ambiguous queries**: Should trigger clarifying questions
- **Unanswerable queries**: Outside the corpus — should refuse gracefully

**Format** (`evaluation/test_set.json`):
```json
[
  {
    "id": "q1",
    "question": "What are the safety requirements for chemical storage?",
    "expected_answer": "Chemical storage requires proper ventilation, temperature control...",
    "relevant_documents": ["Safety Manual 2024.pdf"]
  }
]
```

### Evaluation Pipeline

```python
async def run_evaluation(test_set_path: str):
    test_set = load_test_set(test_set_path)
    results = []

    for test_case in test_set:
        chunks = await hybrid_search(test_case["question"])
        answer = await generate_answer(test_case["question"], chunks)

        faithfulness = await evaluate_faithfulness(answer, chunks)
        relevance = await evaluate_relevance(test_case["question"], answer)
        completeness = await evaluate_completeness(
            test_case["question"], test_case["expected_answer"], answer
        )

        results.append({
            "question": test_case["question"],
            "faithfulness": faithfulness,
            "relevance": relevance,
            "completeness": completeness
        })

    return aggregate_scores(results)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- [UV](https://github.com/astral-sh/uv)
- Terraform 1.7+
- Azure CLI
- Databricks CLI

### Quick Start

**1. Clone and install**
```bash
git clone https://github.com/your-org/enterprise-rag-architecture.git
cd enterprise-rag-architecture
npm install
```

**2. Provision Azure resources**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Azure subscription ID
terraform init && terraform apply
```

**3. Configure environment variables**
```bash
# Copy Terraform outputs to .env files
cd ../apps/api && cp .env.example .env
cd ../apps/web && cp .env.example .env.local
```

**4. Deploy Databricks ingestion jobs**
```bash
cd ../../databricks
databricks bundle deploy --target dev
databricks bundle run document_ingestion_job
```

**5. Start development**
```bash
cd ..
npm run dev
# FastAPI → http://localhost:8000
# Next.js → http://localhost:3000
```
