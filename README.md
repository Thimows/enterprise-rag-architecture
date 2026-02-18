# Enterprise RAG Architecture

A production-grade Retrieval-Augmented Generation system built for enterprise environments. Uses Azure AI Foundry (Kimi K2.5 for inference, text-embedding-3-large for embeddings), Azure AI Search for hybrid retrieval and Azure Databricks for automated document ingestion and chunking workflows.

The entire stack runs inside a single Azure tenant — compute, storage, AI models and data pipelines. No external API calls, no third-party logging, no data leaving your private environment.

<!-- TODO: Add screenshot of the chat interface -->
<!-- ![Chat Interface](docs/assets/chat-interface.png) -->

## What This Does

Users upload internal documents (PDF, Word, TXT) which get parsed, chunked and embedded through an Azure Databricks pipeline. The system then answers questions about those documents through a chat interface with real-time streaming, inline citations and full source traceability.

Every answer includes numbered citation bubbles that link back to the exact source. Hovering a citation highlights the relevant text and shows a tooltip with the source document and page. Clicking opens an artifact panel with a document viewer scrolled to the cited passage.

<!-- TODO: Add screenshot/gif of citation interaction -->
<!-- ![Citations](docs/assets/citations.png) -->

## Architecture

```
┌─── Azure Tenant ───────────────────────────────────────────────────────┐
│                                                                        │
│  Documents (PDF/Word/TXT)                                              │
│          |                                                             │
│          v                                                             │
│    Azure Databricks ──────> Azure AI Search                            │
│    (parse, chunk, embed)    (vector + keyword + semantic index)        │
│                                      |                                 │
│                                      v                                 │
│    Next.js  <──────>  FastAPI  <──────>  Azure AI Foundry              │
│    (chat UI,          (query rewrite,    (Kimi K2.5,                   │
│     streaming,         reranking,         text-embedding-3-large)      │
│     citations)         generation)                                     │
│                                                                        │
│    Azure Blob Storage          Azure Document Intelligence             │
│    (document store)            (PDF/DOCX parsing)                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Key Features

**Ingestion Pipeline**
- Incremental processing: only newly uploaded documents get parsed, chunked and embedded
- Each upload triggers a parameterized Azure Databricks job with the specific document names
- Task values pass document/chunk IDs between pipeline stages within a single job run
- Delta tables grow via append (ACID-safe for concurrent writes from parallel uploads)
- For high-volume production workloads, the pipeline can be replaced with Databricks Auto Loader for real-time streaming ingestion via Azure Event Grid

**RAG Pipeline**
- Document parsing via Azure Document Intelligence with layout analysis
- Semantic chunking that preserves document structure and sentence boundaries
- Hybrid search combining vector, keyword and semantic ranking with RRF fusion
- Optional cross-encoder reranking (benchmarkable against Azure's built-in semantic ranker)
- Answer generation strictly grounded in retrieved context to reduce hallucination

**Citation System**
- Inline citation bubbles `[1]` `[2]` in every answer
- Hover to highlight source text and preview the reference
- Click to open artifact panel with document viewer on the exact page
- Fuzzy text matching to locate and highlight cited passages in the original document

**Streaming**
- Real-time token-by-token streaming from FastAPI to the browser
- Vercel Streamdown for incremental markdown rendering
- Citations parsed and rendered as they stream in

**Evaluation**
- Custom LLM-as-judge pipeline using Kimi K2.5
- Three metrics: faithfulness, relevance, completeness
- Automated evaluation against a curated test set

<!-- TODO: Add evaluation benchmark results -->
<!--
## Benchmarks

| Metric | Score |
|--------|-------|
| Faithfulness | - |
| Relevance | - |
| Completeness | - |
-->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Vercel Streamdown |
| Backend | FastAPI, Python 3.9+, Pydantic, Sentence Transformers |
| AI Services | Azure AI Foundry (Kimi K2.5, text-embedding-3-large), Azure AI Search, Azure Document Intelligence |
| Ingestion | Azure Databricks (premium tier), Databricks Asset Bundles, semantic chunking |
| Infrastructure | Terraform (all Azure resources incl. Databricks workspace), Azure Storage Account |
| Monorepo | Turborepo, npm workspaces, shared ESLint and TypeScript configs |

### Model Configuration

This project uses [Direct from Azure](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/models-sold-directly-by-azure) models — third-party models hosted and managed by Microsoft on Azure infrastructure. Unlike marketplace models (which require separate vendor agreements and portal-based consent flows), Direct from Azure models are purchased through Azure, deployed via Terraform and covered by a single Microsoft license.

The default chat model is **Kimi K2.5** (Moonshot AI). You can swap it for any other Direct from Azure chat model by changing `chat_model_format` and `chat_model_name` in your `terraform.tfvars`:

```hcl
# Third-party models (available on all subscriptions)
chat_model_format = "MoonshotAI"       # default
chat_model_name   = "Kimi-K2.5"       # default

chat_model_format = "DeepSeek"
chat_model_name   = "DeepSeek-V3.2"

chat_model_format = "Mistral AI"
chat_model_name   = "Mistral-Large-3"

chat_model_format = "xAI"
chat_model_name   = "grok-4-fast-reasoning"

# OpenAI models (may require enterprise subscription for newer models)
chat_model_format = "OpenAI"
chat_model_name   = "gpt-5.2-chat"
```

Embeddings use **text-embedding-3-large** (OpenAI via Azure), which is also Direct from Azure.

## Project Structure

```
enterprise-rag-architecture/
  apps/
    api/          FastAPI backend (retrieval, reranking, generation, streaming)
    web/          Next.js frontend (chat UI, citations, artifact panel)
  packages/
    ui/           Shared React components
  databricks/     Azure Databricks ingestion pipeline (parsing, chunking, embedding, indexing)
  terraform/      Azure infrastructure as code
  evaluation/     LLM-as-judge test set and evaluation runner
  docs/           Architecture plan and documentation
```

## Getting Started

### Prerequisites

Install the required tools for your platform:

| Tool | macOS (`brew`) | Windows (`winget`) |
|------|----------------|-------------------|
| Node.js | `brew install node` | `winget install OpenJS.NodeJS` |
| Python | `brew install python` | `winget install Python.Python.3.12` |
| UV | `brew install uv` | `winget install astral-sh.uv` |
| Terraform | `brew install terraform` | `winget install Hashicorp.Terraform` |
| Azure CLI | `brew install azure-cli` | `winget install Microsoft.AzureCLI` |
| Databricks CLI | `brew tap databricks/tap && brew install databricks` | `winget install Databricks.DatabricksCLI` |

After installing, log in to Azure:

```bash
az login
```

The Databricks CLI authenticates automatically through your Azure login — no separate configuration needed. The setup script reads the workspace URL from Terraform and uses your Azure credentials.

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Thimows/enterprise-rag-architecture.git
cd enterprise-rag-architecture
npm install

# 2. Provision Azure resources (incl. Databricks workspace), generate .env files, deploy bundle
./scripts/setup.sh

# 3. Start development (runs both API and web server)
npm run dev
```

The setup script handles everything: Terraform provisioning, `.env` file generation from Terraform outputs, search index creation, Databricks secrets configuration and bundle deployment. It's idempotent and safe to re-run anytime.

The FastAPI server starts at `http://localhost:4001` and the Next.js app at `http://localhost:4000`.

## Security

Designed for enterprise environments where data privacy and compliance are non-negotiable.

- All documents and queries stay within your private Azure tenant
- Azure Databricks workspace runs inside your Azure subscription (not external SaaS)
- No data sent to public AI services or external logging
- RBAC with Azure Managed Identities (no credentials in code)
- Encryption at rest and in transit (TLS 1.2+)
- Input validation and rate limiting on all API endpoints

<!-- TODO: Add architecture diagram -->
<!-- ![Architecture Diagram](docs/assets/architecture.png) -->

## License

MIT
