# Enterprise RAG Architecture

A production-grade Retrieval-Augmented Generation system built for enterprise environments. Uses Azure OpenAI for inference, Azure AI Search for hybrid retrieval and Databricks for automated document ingestion and chunking workflows.

All data stays within your Azure tenant. No external API calls, no third-party logging, no data leaving your private environment.

<!-- TODO: Add screenshot of the chat interface -->
<!-- ![Chat Interface](docs/assets/chat-interface.png) -->

## What This Does

Users upload internal documents (PDF, Word, TXT) which get parsed, chunked and embedded through a Databricks pipeline. The system then answers questions about those documents through a chat interface with real-time streaming, inline citations and full source traceability.

Every answer includes numbered citation bubbles that link back to the exact source. Hovering a citation highlights the relevant text and shows a tooltip with the source document and page. Clicking opens an artifact panel with a document viewer scrolled to the cited passage.

<!-- TODO: Add screenshot/gif of citation interaction -->
<!-- ![Citations](docs/assets/citations.png) -->

## Architecture

```
Documents (PDF/Word/TXT)
        |
        v
  Databricks Jobs ──────> Azure AI Search
  (parse, chunk, embed)    (vector + keyword + semantic index)
                                    |
                                    v
  Next.js  <──────>  FastAPI  <──────>  Azure OpenAI
  (chat UI,          (query rewrite,    (GPT-5.3,
   streaming,         reranking,         text-embedding-3-large)
   citations)         generation)
```

## Key Features

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
- Custom LLM-as-judge pipeline using Azure OpenAI
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
| AI Services | Azure OpenAI (GPT-5.3, text-embedding-3-large), Azure AI Search, Azure Document Intelligence |
| Ingestion | Databricks Jobs via Asset Bundles, semantic chunking |
| Infrastructure | Terraform, Azure Storage Account |
| Monorepo | Turborepo, npm workspaces, shared ESLint and TypeScript configs |

## Project Structure

```
enterprise-rag-architecture/
  apps/
    api/          FastAPI backend (retrieval, reranking, generation, streaming)
    web/          Next.js frontend (chat UI, citations, artifact panel)
  packages/
    ui/           Shared React components
  databricks/     Ingestion pipeline (parsing, chunking, embedding, indexing)
  terraform/      Azure infrastructure as code
  evaluation/     LLM-as-judge test set and evaluation runner
  docs/           Architecture plan and documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- [UV](https://github.com/astral-sh/uv) (Python package manager)
- Terraform 1.7+
- Azure CLI
- Databricks CLI

### Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/enterprise-rag-architecture.git
cd enterprise-rag-architecture
npm install

# 2. Provision Azure resources
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply

# 3. Configure environment
cd ../apps/api && cp .env.example .env
cd ../web && cp .env.example .env.local

# 4. Deploy ingestion pipeline
cd ../../databricks
databricks bundle deploy --target dev

# 5. Start development (runs both API and web server)
cd ..
npm run dev
```

The FastAPI server starts at `http://localhost:8000` and the Next.js app at `http://localhost:3000`.

## Security

Designed for enterprise environments where data privacy and compliance are non-negotiable.

- All documents and queries stay within your private Azure tenant
- No data sent to public AI services or external logging
- RBAC with Azure Managed Identities (no credentials in code)
- Encryption at rest and in transit (TLS 1.2+)
- Input validation and rate limiting on all API endpoints

<!-- TODO: Add architecture diagram -->
<!-- ![Architecture Diagram](docs/assets/architecture.png) -->

## License

MIT
