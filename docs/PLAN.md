# Enterprise RAG Architecture

> A production-grade, enterprise-ready Retrieval-Augmented Generation (RAG) system showcasing best practices for building transparent, citation-based AI applications with Azure AI Foundry (Kimi K2.5), Azure AI Search, and Azure Databricks. The entire stack runs inside a single Azure tenant.

## Purpose

This project demonstrates a **complete, production-ready RAG pipeline** designed for enterprise environments where:

- **Data privacy** is paramount -- all data stays within your Azure tenant
- **Answer transparency** is required -- citations with exact source highlighting
- **Quality assurance** is measurable -- custom LLM-as-judge evaluation
- **Scalability** is built-in --Azure Databricks for batch processing, Azure AI Search for retrieval
- **Developer experience** is optimized -- Turborepo monorepo, hot reload, type safety

Unlike framework-heavy implementations, this showcase uses **direct SDK integration** with Azure services to provide maximum control, transparency, and performance.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
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
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  Documents    │───▶│  Databricks  │───▶│   Azure AI   │              │
│  │  (PDF/Word)   │    │    Jobs      │    │    Search    │              │
│  │              │    │              │    │   (Index)    │               │
│  │   Storage    │    │  • Parse     │    │              │               │
│  │   Account    │    │  • Chunk     │    │  • Vector    │               │
│  └──────────────┘    │  • Embed     │    │  • Keyword   │               │
│                      │  • Metadata  │    │  • Semantic  │               │
│                      └──────────────┘    └──────────────┘               │
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
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Next.js    │───▶│   FastAPI    │───▶│   Azure AI   │               │
│  │   Frontend   │    │   Backend    │    │    Search    │               │
│  │              │    │              │    │              │               │
│  │  • Chat UI   │◀───│  • Query     │◀───│  • Hybrid    │               │
│  │  • Streaming │    │    Rewrite   │    │    Search    │               │
│  │  • Citations │    │  • Rerank    │    │  • Vector +  │               │
│  │  • Sources   │    │  • Generate  │    │    Keyword   │               │
│  └──────────────┘    │              │    └──────────────┘               │
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
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Test Set   │───▶│   FastAPI    │───▶│Azure AI Fndry│               │
│  │              │    │   Evaluator  │    │(LLM-as-Judge)│               │
│  │  • Questions │    │              │    │              │               │
│  │  • Expected  │    │ • Faithfuln. │    │  • Grading   │               │
│  │    Answers   │    │ • Relevance  │    │  • Reasoning │               │
│  └──────────────┘    │ • Completen. │    └──────────────┘               │
│                      └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Azure Databricks Jobs** | Parameterized incremental ingestion, parsing (Document Intelligence), chunking strategies, embedding generation, task value passing between notebooks |
| **Azure AI Search** | Vector + keyword + semantic hybrid search, filtering, index management |
| **FastAPI Backend** | Query understanding, retrieval orchestration, cross-encoder reranking, answer generation with citations, streaming responses |
| **Next.js Frontend** | Chat interface, markdown streaming (Streamdown), citation bubbles, source highlighting, document viewer |
| **Azure AI Foundry** | Chat completions (Kimi K2.5), text embeddings (`text-embedding-3-large`), evaluation (LLM-as-judge) |
| **Terraform** | Infrastructure provisioning (all Azure resources including Databricks workspace and PostgreSQL), reproducible deployments |

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
| **shadcn/ui** | Latest | Accessible, composable component primitives (buttons, inputs, cards, dialogs, sidebars, etc.) -- never hardcode UI primitives |

### Backend

| Technology | Version | Justification |
|------------|---------|---------------|
| **FastAPI** | 0.128+ | High-performance async Python framework with OpenAPI docs |
| **Python** | 3.9+ | Azure SDK compatibility, async/await |
| **UV** | Latest | Fast Python package manager |
| **Azure AI Inference SDK** | Latest | Kimi K2.5 (Moonshot AI) via Azure AI Foundry |
| **Azure AI Inference SDK** | Latest | Embeddings via Azure AI Foundry |
| **Azure AI Search SDK** | Latest | Direct SDK for hybrid search |
| **Sentence Transformers** | Latest | Cross-encoder models for reranking |
| **Drizzle ORM** | Latest | TypeScript schema definitions, migrations, type-safe queries (runs in Next.js) |
| **Pydantic** | 2.x | Data validation, settings management |

### Ingestion Pipeline

| Technology | Version | Justification |
|------------|---------|---------------|
| **Azure Databricks** | Serverless | Scalable batch processing, parameterized jobs with task values |
| **Databricks Asset Bundles** | Latest | Declarative job deployment |
| **Azure Document Intelligence** | Latest | Advanced PDF/Word parsing with layout analysis |

### Infrastructure

| Technology | Version | Justification |
|------------|---------|---------------|
| **Terraform** | 1.7+ | Infrastructure-as-code for all Azure resources including Databricks workspace |
| **Azure AI Foundry** | Kimi K2.5, text-embedding-3-large | Chat and embedding models (Direct from Azure) |
| **Azure AI Search** | Free/Standard tier | Vector + keyword + semantic ranking |
| **Azure Databricks** | Premium tier | Managed Spark workspace for ingestion pipeline |
| **Azure Document Intelligence** | Standard | Document parsing with layout analysis |
| **Azure Database for PostgreSQL** | Flexible Server v16 | Chat history, document metadata, user/org data (BetterAuth) |
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

### 1. Azure Databricks Ingestion Pipeline

**Location**: `databricks/`

The ingestion pipeline runs as a parameterized Azure Databricks Job, defined via Databricks Asset Bundles (DAB) for declarative, version-controlled deployment. The Databricks workspace is provisioned by Terraform inside your Azure subscription.

**Incremental Processing**:

Each job run only processes the documents passed as parameters. When a user uploads `report.pdf` and `contract.docx`, the FastAPI upload endpoint triggers a Databricks job with `document_names=report.pdf,contract.docx`. Only those two documents get parsed, chunked, embedded, and indexed.

Task values (`dbutils.jobs.taskValues`) pass document/chunk IDs between notebook tasks within the same job run. This is scoped per run, so concurrent uploads from different users never interfere with each other. Delta tables grow via `append` mode (ACID-safe for concurrent writes).

```
User uploads report.pdf, contract.docx
        |
        v
FastAPI saves to Blob Storage
        |
        v
Databricks job triggered with params:
  { "document_names": "report.pdf,contract.docx",
    "organization_id": "org-abc", "folder_id": "folder-1" }
        |
        v
01_parsing:  parses only those 2 blobs, appends to parsed_documents
             sets task value: document_ids
        |
        v
02_chunking: gets document_ids via task value, filters parsed_documents
             chunks only those docs, appends to chunks
             sets task value: chunk_ids
        |
        v
03_embedding: gets chunk_ids via task value, filters chunks
              embeds only new chunks, appends to chunks_with_embeddings
              sets task value: chunk_ids (passthrough)
        |
        v
04_indexing:  gets chunk_ids via task value, filters chunks_with_embeddings
              upserts only those to Azure AI Search
```

For high-volume production workloads, the parameterized job approach can be replaced with Databricks Auto Loader for real-time streaming ingestion via Azure Event Grid notifications on Blob Storage.

**Pipeline Steps**:

1. **Document Parsing** (`01_document_parsing.py`) -- Parse PDFs/Word docs via Azure Document Intelligence, extract text, layout, and metadata. Filters by `document_names` parameter.
2. **Chunking** (`02_chunking.py`) -- Apply chunking strategies with overlap and metadata preservation. Receives `document_ids` via task value.
3. **Embedding Generation** (`03_embedding_generation.py`) -- Batch embed chunks using Azure AI Foundry `text-embedding-3-large`. Receives `chunk_ids` via task value.
4. **Indexing** (`04_indexing.py`) -- Upsert chunks + embeddings to Azure AI Search index. Receives `chunk_ids` via task value.

**Search Index Creation**: The Azure AI Search index is created as a standalone Python script (`apps/api/scripts/create_search_index.py`) during `setup.sh`, not as a Databricks notebook. It has no Databricks-specific logic and reads credentials from the same `.env` as the FastAPI app.

**Chunking Strategies**:

```python
# Semantic chunking -- preserve sentence boundaries
semantic_chunks = semantic_chunker(text, max_tokens=512, overlap_tokens=50)

# Structure-aware -- respect document hierarchy (headers, sections)
structured_chunks = structure_aware_chunker(text, layout_data, max_tokens=512)

# Sliding window -- fixed-size with overlap
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
      parameters:
        - name: document_names
          default: ""
      environments:
        - environment_key: ingestion_env
          spec:
            client: "1"
            dependencies:
              - azure-ai-formrecognizer>=3.3.0
              - azure-search-documents>=11.4.0
              - azure-ai-inference>=1.0.0b9
              - tiktoken>=0.7.0
      tasks:
        - task_key: parse_documents
          notebook_task:
            notebook_path: ./notebooks/01_document_parsing.py
            base_parameters:
              document_names: "{{job.parameters.document_names}}"
          environment_key: ingestion_env
        - task_key: chunk_documents
          depends_on:
            - task_key: parse_documents
          notebook_task:
            notebook_path: ./notebooks/02_chunking.py
          environment_key: ingestion_env
        - task_key: generate_embeddings
          depends_on:
            - task_key: chunk_documents
          notebook_task:
            notebook_path: ./notebooks/03_embedding_generation.py
          environment_key: ingestion_env
        - task_key: index_documents
          depends_on:
            - task_key: generate_embeddings
          notebook_task:
            notebook_path: ./notebooks/04_indexing.py
          environment_key: ingestion_env

targets:
  dev:
    mode: development
    default: true
  staging:
    mode: development
  prod:
    mode: production
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
    { "name": "organization_id", "type": "Edm.String", "filterable": true },
    { "name": "folder_id", "type": "Edm.String", "filterable": true },
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
    # 1. Query rewriting -- use history to resolve references
    #    "what about the second one?" -> standalone query
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

    # 3. Rerank (optional -- cross-encoder vs Azure semantic ranking)
    if settings.RERANKING_ENABLED:
        reranked_chunks = await rerank_chunks(
            query=optimized_query,
            chunks=search_results,
            top_k=10
        )
    else:
        reranked_chunks = search_results[:10]

    # 4. Generate answer with citations (streaming)
    #    Includes conversation history (capped at last N turns) for
    #    natural conversational flow + retrieved chunks for grounding.
    #    History is used for tone/continuity, chunks are the source of truth.
    return StreamingResponse(
        generate_answer_stream(
            query=request.query,
            chunks=reranked_chunks,
            conversation_history=request.history[-MAX_HISTORY_TURNS:],
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

- **ChatInterface** --Main chat component with message list and input
- **StreamingMessage** --Real-time markdown rendering via Vercel Streamdown
- **CitationBubble** --Inline `[1]` `[2]` bubbles with two interaction modes:
  - **Hover**: Highlight the cited text in the sources pane + show a tooltip with source name, page number, and chunk preview
  - **Click**: Open the artifact panel from the right with the full document viewer, scrolled to the correct page, with the cited passage highlighted
- **SourcesPane** -- Below the answer showing source chunks with document name and page number
- **ArtifactPanel** -- Slide-in panel from the right, opens on citation click. Contains the document viewer with the original PDF rendered, navigated to the relevant page, with the cited text highlighted using fuzzy text matching against the chunk content
- **DocumentViewer** -- PDF viewer (PDF.js) with highlight overlay. Uses fuzzy text matching of the chunk content against the rendered page text to locate and highlight the exact passage

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
 1. QUERY REWRITING (FastAPI + Kimi K2.5)
    Use conversation history to resolve pronouns, expand abbreviations
    Produce a standalone query for retrieval
        │
        ▼
 2. EMBEDDING GENERATION
    Azure AI Foundry text-embedding-3-large -> 3072-dim vector
        │
        ▼
 3. HYBRID SEARCH (Azure AI Search)
    Vector search (cosine) + Keyword search (BM25) + Semantic ranking
    RRF fusion -> Top 50 chunks
        │
        ▼
 4. RERANKING (optional, toggleable)
    Azure semantic ranking is the default reranker.
    Optional cross-encoder reranking for benchmarking against Azure's built-in ranking.
    Score each query-chunk pair -> Top 10 most relevant
        │
        ▼
 5. CONTEXT PREPARATION
    Format chunks with [1], [2], ... identifiers + metadata
        │
        ▼
 6. ANSWER GENERATION (Azure AI Foundry -- Kimi K2.5)
    Send: system prompt + conversation history (last N turns) + chunks + query
    History provides conversational continuity, chunks are the source of truth
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
 User uploads documents via FastAPI (with organization_id + folder_id)
        |
        v
 FastAPI saves to Azure Blob Storage at {org_id}/{folder_id}/{filename}
        |
        v
 Databricks job triggered with document_names, organization_id, folder_id
        |
        v
 1. DOCUMENT PARSING (Databricks + Document Intelligence)
    Parse only the uploaded documents, extract text/layout/metadata
    Set task value: document_ids
        |
        v
 2. CHUNKING (Databricks)
    Get document_ids via task value, chunk only those documents
    Set task value: chunk_ids
        |
        v
 3. EMBEDDING GENERATION (Azure AI Foundry)
    Get chunk_ids via task value, embed only new chunks (batch of 100)
    Set task value: chunk_ids (passthrough)
        |
        v
 4. INDEXING (Azure AI Search)
    Get chunk_ids via task value, upsert only new chunks
    Batch upload with merge_or_upload (idempotent)
```

Delta tables use append mode throughout. Each job run only touches the documents passed as parameters. Concurrent uploads from different users are safe (ACID-guaranteed by Delta).

---

## Database Schema

All primary keys are **UUIDv7** (time-sortable, globally unique). The database is Azure Database for PostgreSQL Flexible Server. Schema is defined in TypeScript using **Drizzle ORM** (`apps/web/src/db/schema/`), which provides type-safe queries and migration management via `drizzle-kit`.

### BetterAuth Tables (managed by BetterAuth)

These tables are created and managed by BetterAuth with the organization plugin. We do not modify their schema -- BetterAuth handles migrations. Listed here for reference.

```
user
├── id              UUIDv7 (PK)
├── name            text
├── email           text (unique)
├── emailVerified   boolean
├── image           text (nullable)
├── createdAt       timestamp
└── updatedAt       timestamp

session
├── id              UUIDv7 (PK)
├── expiresAt       timestamp
├── token           text (unique, session token)
├── ipAddress       text (nullable)
├── userAgent       text (nullable)
├── userId          UUIDv7 (FK -> user.id)
├── createdAt       timestamp
└── updatedAt       timestamp

account
├── id              UUIDv7 (PK)
├── accountId       text (provider-specific ID)
├── providerId      text (e.g. "credential", "google")
├── userId          UUIDv7 (FK -> user.id)
├── accessToken     text (nullable)
├── refreshToken    text (nullable)
├── idToken         text (nullable)
├── expiresAt       timestamp (nullable)
├── password        text (nullable, hashed)
├── createdAt       timestamp
└── updatedAt       timestamp

organization
├── id              UUIDv7 (PK)
├── name            text
├── slug            text (unique)
├── logo            text (nullable)
├── metadata        text (nullable)
└── createdAt       timestamp

member
├── id              UUIDv7 (PK)
├── organizationId  UUIDv7 (FK -> organization.id)
├── userId          UUIDv7 (FK -> user.id)
├── role            text (owner | admin | member)
└── createdAt       timestamp

invitation
├── id              UUIDv7 (PK)
├── organizationId  UUIDv7 (FK -> organization.id)
├── email           text
├── role            text (admin | member)
├── status          text (pending | accepted | rejected | canceled | expired)
├── expiresAt       timestamp
├── inviterId       UUIDv7 (FK -> user.id)
└── createdAt       timestamp
```

### Application Tables

Application-specific tables use snake_case naming. All scoped by `organization_id` for multi-tenancy.

```
folder
├── id                UUIDv7 (PK)
├── organization_id   UUIDv7 (FK -> organization.id)
├── name              text
├── description       text (nullable)
├── created_by        UUIDv7 (FK -> user.id)
├── created_at        timestamp
└── updated_at        timestamp

document
├── id                UUIDv7 (PK)
├── organization_id   UUIDv7 (FK -> organization.id)
├── folder_id         UUIDv7 (FK -> folder.id)
├── name              text (original filename)
├── blob_url          text (Azure Blob Storage URL)
├── file_type         text (pdf | docx | txt)
├── file_size         bigint (bytes)
├── status            text (uploading | processing | indexed | failed)
├── uploaded_by       UUIDv7 (FK -> user.id)
├── created_at        timestamp
└── updated_at        timestamp

chat
├── id                UUIDv7 (PK)
├── organization_id   UUIDv7 (FK -> organization.id)
├── user_id           UUIDv7 (FK -> user.id)
├── title             text (nullable, auto-generated from first message)
├── created_at        timestamp
└── updated_at        timestamp

message
├── id                UUIDv7 (PK)
├── chat_id           UUIDv7 (FK -> chat.id)
├── role              text (user | assistant)
├── content           text
└── created_at        timestamp

citation
├── id                UUIDv7 (PK)
├── message_id        UUIDv7 (FK -> message.id)
├── number            int (display number [1], [2], etc.)
├── document_id       UUIDv7 (FK -> document.id)
├── document_name     text
├── page_number       int
├── chunk_text        text
├── relevance_score   float
└── created_at        timestamp
```

### Relationships

```
organization ──1:N──> folder ──1:N──> document
organization ──1:N──> chat ──1:N──> message ──1:N──> citation
                                                       │
organization ──N:N──> user (via member)          document <──┘
```

### Notes

- **BetterAuth uses camelCase**, application tables use snake_case -- this is intentional. BetterAuth manages its own schema and we don't control its naming conventions.
- **UUIDv7** is preferred over UUIDv4 because it is time-sortable, which gives better index locality and allows `ORDER BY id` as a natural chronological sort.
- **`document.status`** tracks the lifecycle: `uploading` → `processing` (Databricks job running) → `indexed` (searchable) or `failed`.
- **`chat.title`** is auto-generated from the first user message (e.g. first 80 chars or an LLM-generated summary). Nullable until the first message is sent.
- **Citations are persisted** per assistant message so chat history can render citation bubbles without re-running retrieval.
- **Search index is separate** from the database. The search index (Azure AI Search) stores chunk-level data for retrieval. The database stores document-level metadata and chat history. They are linked by `document_id`.
- **Database**: Azure Database for PostgreSQL Flexible Server (v16), provisioned via Terraform (`terraform/modules/postgresql/`). Burstable B1ms SKU, 32 GB storage. `DATABASE_URL` is generated by `setup.sh` into both `apps/api/.env` and `apps/web/.env.local`.
- **Drizzle ORM** manages schema definitions (`apps/web/src/db/schema/`) and migrations (`drizzle/`). BetterAuth uses Drizzle's adapter, so all tables (auth + application) are defined in one place. Run `npx drizzle-kit push` to sync schema to the database, or `npx drizzle-kit generate` + `npx drizzle-kit migrate` for versioned migrations. FastAPI reads from the same database via `DATABASE_URL` using raw SQL or `asyncpg` -- Drizzle is the single source of truth for schema.

---

## Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETE

**Goal**: Infrastructure, project scaffold, basic integrations

| Task | Status | Details |
|------|--------|---------|
| Terraform IaC | ✅ Done | Resource group, Azure AI Foundry (Kimi K2.5 + embeddings), Azure AI Search, Document Intelligence, Storage Account, Azure Databricks -- modular setup in `terraform/` with 5 modules |
| Monorepo setup | ✅ Done | `apps/api/package.json` added with `dev` script so `npm run dev` starts both Next.js and FastAPI concurrently via Turborepo |
| FastAPI scaffold | ✅ Done | App entry with CORS, Pydantic settings, Azure SDK client factories, routers (health, chat, documents) under `/api/v1`, `.env.example` |
| Next.js scaffold | ✅ Done | Tailwind CSS v4 with `@tailwindcss/postcss`, chat layout skeleton with header/message area/input bar, dark mode support, `.env.example` |

**Deliverables**: All Azure resources defined in Terraform, `npm run dev` starts both apps, `/api/v1/health` endpoint returns `{"status": "healthy"}`, basic chat UI shell at `localhost:4000`

---

### Phase 1.5: Provision Infrastructure ✅ COMPLETE

**Goal**: Actually run Terraform and Databricks deployments so Azure resources and Databricks jobs exist

| Task | Status | Details |
|------|--------|---------|
| Provision Azure resources | ✅ Done | `./scripts/setup.sh` runs Terraform automatically -- AI Foundry (Kimi K2.5 + text-embedding-3-large), AI Search, Document Intelligence, Storage Account, Azure Databricks workspace all provisioned |
| Configure `.env` files | ✅ Done | Setup script generates `apps/api/.env` and `apps/web/.env.local` from Terraform outputs |
| Run database migrations | | Setup script runs `npx drizzle-kit push` inside `apps/web` to sync the Drizzle schema to the PostgreSQL database (creates all tables) |
| Create search index | ✅ Done | Setup script runs `apps/api/scripts/create_search_index.py` to create/update the Azure AI Search index |
| Create Databricks secrets scope | ✅ Done | Setup script authenticates Databricks CLI via Azure CLI token, creates `rag-ingestion` scope and writes 10 secrets |
| Deploy Databricks bundle | ✅ Done | Serverless compute, parameterized ingestion job, environments with pip dependencies |
| Verify | ✅ Done | Azure Portal shows all resources, Databricks workspace has ingestion job deployed |

**Deliverables**: Live Azure resources (AI Foundry, AI Search, Storage, Document Intelligence, Databricks workspace, PostgreSQL), database tables created via Drizzle, ingestion job deployed and ready to run

---

### Phase 2: Ingestion Pipeline ✅ COMPLETE

**Goal**: Incremental Databricks pipeline for document processing

| Task | Status | Details |
|------|--------|---------|
| Databricks utilities | ✅ Done | Client factories using `dbutils.secrets`, chunking strategies (semantic, structure-aware, sliding window with tiktoken), quality validation checks in `databricks/utils/` |
| Document parsing notebook | ✅ Done | `01_document_parsing.py` -- Accepts `document_names` parameter, parses only those blobs via Azure Document Intelligence `prebuilt-layout`, appends to Delta table `rag_ingestion.parsed_documents`, sets task value `document_ids` |
| Chunking notebook | ✅ Done | `02_chunking.py` -- Gets `document_ids` via task value, chunks only those documents, appends to Delta table `rag_ingestion.chunks`, sets task value `chunk_ids` |
| Embedding generation notebook | ✅ Done | `03_embedding_generation.py` -- Gets `chunk_ids` via task value, embeds only new chunks via Azure AI Foundry EmbeddingsClient (batch of 100, exponential backoff), appends to Delta table `rag_ingestion.chunks_with_embeddings`, passes `chunk_ids` forward |
| Search indexing notebook | ✅ Done | `04_indexing.py` -- Gets `chunk_ids` via task value, upserts only new chunks via `merge_or_upload_documents` |
| Azure AI Search index setup | ✅ Done | Moved to `apps/api/scripts/create_search_index.py` (standalone script, runs during `setup.sh`) -- 11 fields (including `organization_id` and `folder_id` as filterable), HNSW vector search (cosine, 3072-dim), semantic ranking config, idempotent `create_or_update_index` |
| Databricks Asset Bundles | ✅ Done | `databricks.yml` with parameterized ingestion job (`document_names` parameter), 4 sequential tasks with dependencies using task values, serverless compute, 3 targets (dev/staging/prod) |
| Document upload API | ✅ Done | `POST /documents/upload` (PDF/DOCX/TXT, 50MB max, stored at `{org_id}/{folder_id}/{filename}`), `GET /documents?organization_id=...&folder_id=...` (list blobs), Pydantic models in `document_models.py` |
| Azure Databricks migration | ✅ Done | Terraform module provisions Databricks workspace inside Azure subscription, setup.sh authenticates via Azure CLI token (no separate Databricks login needed) |

**Deliverables**: End-to-end incremental ingestion job triggered per upload, Delta tables grow via append, concurrent uploads are safe

---

### Phase 3: Retrieval + Generation ✅ COMPLETE

**Goal**: Full RAG pipeline in FastAPI with multi-tenant data scoping

| Task | Status | Details |
|------|--------|---------|
| Multi-tenant data scoping | ✅ Done | All data scoped by `organization_id` (required) + `folder_id` (optional filter). Blob storage path: `{org_id}/{folder_id}/{filename}`. Search index has both as filterable fields. Databricks pipeline carries both through all notebooks via task values. BetterAuth (with organization plugin) will extract org from token in Phase 4 -- for now, `organization_id` is a request parameter. |
| Query rewriting | ✅ Done | `services/query_service.py` -- Uses conversation history + Kimi K2.5 to rewrite follow-ups into standalone queries. Short-circuits if no history (no LLM call). `temperature=0.0` for deterministic output. |
| Hybrid search | ✅ Done | `services/retrieval_service.py` -- Azure AI Search SDK with `VectorizedQuery` + `QueryType.SEMANTIC`. Always filters by `organization_id`, optionally by `folder_ids` and `document_names` via OData. Returns top 50 chunks sorted by semantic reranker score. |
| Cross-encoder reranking | ✅ Done | `services/reranking_service.py` -- Sentence Transformers `cross-encoder/ms-marco-MiniLM-L-12-v2`, enabled by default (`RERANKING_ENABLED=true`). Lazy-loaded on first call. Scores each query-chunk pair and returns top K most relevant. |
| Answer generation | ✅ Done | `services/generation_service.py` -- Kimi K2.5 streaming with conversation history (capped at last N turns) + retrieved chunks. System prompt enforces citation rules. SSE events: `chunk` → `citation` → `done`. Non-streaming variant for evaluation. |
| Citation extraction | ✅ Done | Regex `\[(\d+)\]` after streaming completes, maps 1-indexed numbers to source chunks, emits citation SSE events with document metadata. |
| Chat API endpoints | ✅ Done | `POST /chat/stream` (SSE streaming) and `POST /chat/query` (non-streaming, returns `ChatQueryResponse`). Both require `organization_id`, support optional `folder_ids` and `document_names` filters. Pipeline: rewrite → embed → search → rerank → generate, all wrapped in `asyncio.to_thread()`. |

**Multi-tenancy**: All data is scoped per organization for BetterAuth integration. Documents live in folders within an organization. Blob storage uses `{org_id}/{folder_id}/{filename}` prefix paths. Azure AI Search index has `organization_id` and `folder_id` as filterable fields. Search always filters by `organization_id`; users can optionally filter by specific `folder_ids` (empty = all folders in org). BetterAuth token extraction happens in Phase 4.

**Conversation history**: Both query rewriting and answer generation receive conversation history. Query rewriting uses it to produce a standalone retrieval query. Answer generation uses it (capped at last N turns) for natural conversational flow, while the system prompt strictly enforces that all factual claims must cite retrieved chunks. This prevents the model from hallucinating based on prior turns.

**Deliverables**: Full RAG pipeline with query rewriting, hybrid search, cross-encoder reranking, streaming answer generation with citations, and multi-tenant data scoping

---

### Phase 4A: Database, Auth & Foundations ✅ COMPLETE

**Goal**: Set up Drizzle ORM, BetterAuth (with organization plugin), database schema, and migrations

| Task | Status | Details |
|------|--------|---------|
| Drizzle ORM setup | ✅ Done | `drizzle-orm`, `pg`, `drizzle-kit`. `lib/db/index.ts` (Drizzle client), `lib/db/schema/index.ts` (barrel export), `drizzle.config.ts` |
| BetterAuth config | ✅ Done | `lib/auth.ts` (server config with Drizzle adapter + organization plugin + nextCookies), `lib/auth-client.ts` (client with organizationClient), `app/api/auth/[...all]/route.ts` (catch-all handler) |
| Auth schema generation | ✅ Done | `npx @better-auth/cli generate` → `lib/db/schema/auth.ts` with user, session, account, verification, organization, member, invitation tables + Drizzle relations |
| Application schema | ✅ Done | `lib/db/schema/app.ts` with folder, document, chat, message, citation tables (UUIDv7 PKs, organization-scoped, with Drizzle relations) |
| setup.sh migration step | ✅ Done | Added `drizzle-kit push` as Step 3/6 after `.env` generation, before search index creation. Also generates `BETTER_AUTH_SECRET` |
| Auth pages | ✅ Done | `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `app/(auth)/layout.tsx` — email/password forms with auto-org creation on sign-up |
| Path aliases | ✅ Done | `@/*` path alias in `tsconfig.json` |
| Environment variables | ✅ Done | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` in `.env.example` and auto-generated in `setup.sh` |

**Deliverables**: Working auth flow (sign-up, sign-in, organization creation), all database tables defined, `drizzle-kit push` in setup script, middleware route protection

---

### Phase 4B: Frontend UI ✅ COMPLETE

**Goal**: Clean, modern chat interface with streaming, citations, and document management

**Design Principles**:
- All UI primitives **must use shadcn/ui components** -- never hardcode HTML elements for buttons, inputs, cards, dialogs, sidebars, tooltips, etc.
- **Neutral color scheme** via Tailwind CSS variables, with full light and dark mode support
- Clean, minimal aesthetic -- no visual clutter
- Organization context from BetterAuth (`useSession` + `useActiveOrganization`)
- Chat/folder persistence via Drizzle (PostgreSQL)

**Sidebar** (shadcn `Sidebar` primitive):

The sidebar is the primary navigation element, always visible on the left:

1. **Workspace switcher** (top) -- Switch between organizations via BetterAuth `useListOrganizations` + `organization.setActive()`
2. **New chat button** -- Creates a new chat session, prominent placement below the switcher
3. **File explorer button** -- Navigates to a dedicated page showing folders and files in shadcn `Table` components. Folders are expandable; files show name, type, size, status. Upload happens from this page
4. **Chat history list** -- Scrollable list of previous chat sessions from DB, sorted by most recent. Shows chat title (auto-generated from first message). Clicking opens that chat
5. **Footer** -- User menu (avatar + name from `useSession`), theme toggle

**Sidebar Layout**:
```
┌─────────────────────┐
│  [Workspace ▾]      │  ← Organization switcher (BetterAuth)
├─────────────────────┤
│  [+ New Chat]       │  ← New chat button
│  [Files]            │  ← File explorer (navigates to /files page)
├─────────────────────┤
│  Chat History       │
│  ┌─────────────────┐│
│  │ Safety regs...  ││  ← Most recent (from DB)
│  │ Chemical stor.. ││
│  │ Warehouse FAQ   ││
│  │ ...             ││
│  └─────────────────┘│
├─────────────────────┤
│  [User ▾] [Theme]   │  ← User menu + dark mode toggle
└─────────────────────┘
```

**File Explorer Page** (`/files`):
- Folder list with create/rename/delete actions (Drizzle CRUD)
- Click folder to see its documents in a shadcn `Table` (name, type, size, status, uploaded date)
- Upload button per folder (drag-and-drop or file picker, calls FastAPI upload)
- Document status badges: uploading → processing → indexed / failed

| Task | Status | Details |
|------|--------|---------|
| shadcn/ui setup | ✅ Done | Initialized shadcn/ui (neutral, new-york), installed 16 components: Button, Input, Textarea, Card, Dialog, Sidebar, Tooltip, ScrollArea, Separator, Table, DropdownMenu, Badge, Sheet, Skeleton, Avatar, use-mobile hook |
| Theme + layout | ✅ Done | `next-themes` ThemeProvider, neutral Tailwind v4 CSS variables (`:root` + `.dark`), `@theme inline` block with sidebar vars. Route groups: `(auth)/` for sign-in/up, `(app)/` for sidebar layout |
| Sidebar | ✅ Done | shadcn Sidebar with workspace switcher (BetterAuth orgs), new chat button, files link, chat history list (DB-backed), user menu + theme toggle in footer. Responsive mobile overlay |
| API client + types | ✅ Done | `lib/types.ts` mirroring FastAPI models. `lib/api-client.ts` with `streamChat()` async generator, `uploadDocument()`, `listDocuments()` |
| Chat interface | ✅ Done | ChatInterface, MessageList, MessageBubble, MessageInput (Textarea + Button), auto-scroll, empty state. Chat persisted to DB via API routes (chats, messages) |
| Streaming | ✅ Done | `useStreamingChat` hook (SSE with AbortController, message persistence). Citation-aware `StreamingMessage` with blinking cursor |
| Citation bubbles | ✅ Done | Inline `[N]` parsed from content, rendered as CitationBubble with Tooltip (doc name, page, chunk preview). Click opens artifact panel |
| Sources pane | ✅ Done | Horizontal scroll of source Cards below answer. Highlights active chunk on citation hover |
| Artifact panel | ✅ Done | Sheet slide-in from right on citation click. Shows doc name, page, relevance score, chunk text. Full PDF deferred to Phase 5 |
| File explorer page | ✅ Done | `/files` route with folder sidebar + document table. FolderCreateDialog, UploadButton, DocumentTable with status badges. API routes for CRUD |
| Dark mode | ✅ Done | Neutral color scheme in CSS variables, toggle in sidebar footer, respects system preference via `next-themes` |
| Route protection | ✅ Done | Middleware redirects to `/sign-in` if no session cookie. Server-side session check in app layout |
| Polish | ✅ Done | Loading skeletons, smooth panel transitions, streaming cursor animation, responsive sidebar |

**Deliverables**: Fully functional chat with sidebar navigation, workspace switching (BetterAuth), file management, real-time streaming, citation hover tooltips, sources pane, and artifact panel. Chat history and folders persisted in PostgreSQL. All UI built on shadcn/ui with neutral theme in light/dark mode.

---

### Phase 5: Advanced Features

**Goal**: Evaluation, quality improvements

| Task | Details |
|------|---------|
| LLM-as-judge evaluation | 3 metrics (faithfulness, relevance, completeness), grading prompts via Kimi K2.5, test set (10-20 questions) |
| Reranking benchmark | Compare Azure semantic ranking vs cross-encoder reranking on eval metrics --measure faithfulness/relevance delta to justify the added complexity |
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
│   │   │   ├── generation_service.py # Kimi K2.5 chat completions
│   │   │   ├── query_service.py      # Query rewriting
│   │   │   └── evaluation_service.py # LLM-as-judge evaluation
│   │   ├── models/
│   │   │   ├── chat_models.py
│   │   │   ├── document_models.py
│   │   │   └── evaluation_models.py
│   │   ├── config/
│   │   │   └── settings.py           # Pydantic settings
│   │   ├── scripts/
│   │   │   └── create_search_index.py # Standalone search index creation (run during setup.sh)
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
│   ├── databricks.yml                # DAB config (parameterized ingestion job)
│   ├── notebooks/
│   │   ├── 01_document_parsing.py    # Filters by document_names, sets task value: document_ids
│   │   ├── 02_chunking.py           # Gets document_ids via task value, sets chunk_ids
│   │   ├── 03_embedding_generation.py # Gets chunk_ids via task value, passes forward
│   │   └── 04_indexing.py           # Gets chunk_ids via task value, upserts to search
│   ├── utils/
│   │   ├── chunking_strategies.py
│   │   ├── azure_clients.py
│   │   └── quality_checks.py
│   └── config/
│       ├── dev.yml                   # Development target (default)
│       ├── staging.yml               # Staging target
│       └── prod.yml                  # Production target
│
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── provider.tf
│   ├── modules/
│   │   ├── ai-foundry/
│   │   ├── azure-search/
│   │   ├── databricks/              # Azure Databricks workspace
│   │   ├── postgresql/             # Azure PostgreSQL Flexible Server
│   │   ├── storage/
│   │   └── document-intelligence/
│   └── terraform.tfvars.example
│
├── evaluation/
│   ├── test_set.json                 # Evaluation questions + expected answers
│   ├── run_evaluation.py
│   └── results/
│
├── scripts/
│   └── setup.sh                      # One-command setup (Terraform, .env, index, secrets, bundle)
│
├── docs/
│   └── PLAN.md                       # This file
│
├── pyrightconfig.json                # Python linting config (scoped per directory)
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
  "organization_id": "org-abc123",
  "query": "What are the safety requirements for chemical storage?",
  "conversation_history": [
    { "role": "user", "content": "Tell me about warehouse safety." },
    { "role": "assistant", "content": "Warehouse safety includes..." }
  ],
  "filters": {
    "folder_ids": ["folder-1"],
    "document_names": ["Safety Manual 2024.pdf"]
  },
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

Upload document for ingestion (multipart form data). Requires `organization_id` and `folder_id` form fields. Blob is stored at `{organization_id}/{folder_id}/{filename}`.

**Response**:
```json
{
  "document_id": "doc_abc123",
  "organization_id": "org-abc123",
  "folder_id": "folder-1",
  "status": "processing",
  "message": "Document uploaded. Ingestion job started."
}
```

### `GET /api/v1/documents`

List documents for an organization. Requires `organization_id` query param, optionally filter by `folder_id`.

### `POST /api/v1/evaluation/run`

Run evaluation pipeline with LLM-as-judge.

### `GET /api/v1/evaluation/{evaluation_id}`

Get evaluation results with per-question scores and reasoning.

---

## Security Considerations

Designed for secure enterprise environments. All documents and queries remain within a private Azure tenant. No data is sent to public AI services.

### Data Sovereignty
- All data remains in your Azure tenant (including the Databricks workspace)
- Direct Azure SDK integration -- no data sent to external services
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
- No PII in logs --sanitize queries before logging
- Audit trails for document uploads, index updates, access patterns

### Input Validation
- Pydantic model validation on all API inputs
- Query sanitization
- File upload restrictions (PDF, Word, TXT; max 50MB)

---

## Evaluation Strategy

### Custom LLM-as-Judge

A custom evaluation pipeline using Kimi K2.5 as a judge, providing full control over metrics, prompts, and scoring.

### Metrics

| Metric | Definition |
|--------|-----------|
| **Faithfulness** | Does the answer only use information from the provided context? (hallucination detection) |
| **Relevance** | Does the answer address the question? |
| **Completeness** | Does the answer cover all aspects of the question? |

Each metric is scored 0-10 by Kimi K2.5 with a grading prompt and reasoning.

### Test Set

10-20 questions covering:
- **Factual lookup**: Direct answers from a single source
- **Multi-hop reasoning**: Combining information from multiple chunks
- **Ambiguous queries**: Should trigger clarifying questions
- **Unanswerable queries**: Outside the corpus --should refuse gracefully

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
- Azure CLI (`az login`)
- Databricks CLI (authenticates automatically via Azure CLI)

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Thimows/enterprise-rag-architecture.git
cd enterprise-rag-architecture
npm install

# 2. Provision Azure resources, generate .env files, create search index, deploy bundle
./scripts/setup.sh

# 3. Start development (runs both API and web server)
npm run dev
# FastAPI  -> http://localhost:4001
# Next.js  -> http://localhost:4000
```

The setup script handles everything in one command: Terraform provisioning (all Azure resources including Databricks workspace and PostgreSQL), `.env` file generation from Terraform outputs, database migration via `drizzle-kit push` (creates all tables), Azure AI Search index creation, Databricks secrets configuration (via Azure CLI token), and bundle deployment. It is idempotent and safe to re-run.
