# Enterprise RAG Architecture

A production-grade Retrieval-Augmented Generation system built for enterprise environments. Uses Azure AI Foundry (Mistral Large 3 for answer generation, GPT-5 Nano for query rewriting, text-embedding-3-large for embeddings), Azure AI Search for hybrid retrieval and Azure Databricks for automated document ingestion and chunking workflows.

The entire stack runs inside a single Azure tenant -compute, storage, AI models and data pipelines. No external API calls, no third-party logging, no data leaving your private environment.

![Chat Interface](assets/app-preview.png)

## What This Does

Users upload internal documents (PDF, Word, TXT) which get parsed, chunked and embedded through an Azure Databricks pipeline. The system then answers questions about those documents through a chat interface with real-time streaming, inline citations and full source traceability.

The entire infrastructure is provisioned through Terraform in a single `terraform apply` -Azure AI Foundry (three model deployments), Azure AI Search (hybrid index with vector + keyword + semantic ranking), Azure Databricks (ingestion pipeline), Azure PostgreSQL (auth, chat history, document metadata), Azure Blob Storage (document store), and Azure Document Intelligence (PDF/DOCX parsing). An interactive setup script handles everything from provisioning to environment configuration, database schema push, search index creation, and Databricks bundle deployment.

The retrieval pipeline uses a custom query rewriter (GPT-5 Nano) that turns follow-up questions into standalone search queries and classifies conversational messages to skip retrieval entirely. Retrieval uses hybrid search (vector + keyword + RRF fusion) with Azure's semantic ranker for reranking. The semantic ranker internally reranks the top 50 candidates and returns the best `CONTEXT_TOP_K` (default 10) results for generation. The semantic ranker can be toggled on or off per request, making it easy to benchmark its impact on retrieval quality and latency.

Every answer includes numbered citation bubbles that link back to the exact source. Hovering a citation highlights the relevant text and shows a tooltip with the source document and page. Clicking opens an inline artifact panel with the document viewer scrolled to the cited passage. Multi-tenant workspaces keep documents, search results and chat history scoped per organization.

![Citations](assets/citations.png)

## Architecture

```mermaid
flowchart TB
    subgraph tenant["Azure Tenant"]
        direction TB

        subgraph ingestion["Ingestion Pipeline"]
            blob["Azure Blob Storage<br>document store"]
            docint["Document Intelligence<br>PDF & DOCX parsing"]
            databricks["Azure Databricks<br>parse · chunk · embed"]
        end

        subgraph retrieval ["Retrieval & Generation"]
            search["Azure AI Search<br>vector + keyword + semantic"]
            foundry["Azure AI Foundry<br>Mistral Large 3 · GPT-5 Nano<br>text-embedding-3-large"]
        end

        subgraph application ["Application Layer"]
            next["Next.js<br>chat UI · streaming · citations"]
            fastapi["FastAPI<br>query rewrite · retrieval · generation"]
            pg[("Azure PostgreSQL<br>auth · chat history · documents")]
        end
    end

    docs["Documents<br>PDF · Word · TXT"] --> blob
    blob --> databricks
    databricks <--> docint
    databricks --> search
    databricks -.->|status updates| pg
    next <--> fastapi
    fastapi <--> search
    fastapi <--> foundry
    fastapi <--> pg
```

## Key Features

**Ingestion Pipeline**
- Incremental processing: only newly uploaded documents get parsed, chunked and embedded
- Each upload triggers a parameterized Azure Databricks job with the specific document names
- Task values pass document/chunk IDs between pipeline stages within a single job run
- Delta tables grow via append (ACID-safe for concurrent writes from parallel uploads)
- For high-volume production workloads, the pipeline can be replaced with Databricks Auto Loader for real-time streaming ingestion via Azure Event Grid

**RAG Pipeline**
- Smart query rewriting via GPT-5 Nano (with `reasoning_effort: low`) -rewrites follow-up questions into standalone retrieval queries using conversation history, while classifying conversational messages (greetings, thanks, small talk) to skip the RAG pipeline entirely for faster, more natural responses
- Document parsing via Azure Document Intelligence with layout analysis
- Custom chunking strategies (see below) -no dependency on Azure's built-in indexer pipeline, giving you full control over chunk size, overlap and splitting logic
- Hybrid search combining vector, keyword and semantic ranking with RRF fusion
- Hybrid search returns `CONTEXT_TOP_K` results (default 10) - Azure's semantic ranker (cross-encoder) always reranks the top 50 internally, so the results you get back are already the best reranked matches
- Per-query folder filtering -users can scope retrieval to specific folders or search across all folders, directly from the chat input
- Answer generation strictly grounded in retrieved context to reduce hallucination
- All blocking Azure SDK calls wrapped in `asyncio.to_thread()` -the ASGI event loop never blocks, keeping concurrent requests responsive

**Chunking Strategies**

The ingestion pipeline uses custom chunking logic (`databricks/utils/chunking_strategies.py`) rather than Azure's built-in indexer skillsets. This gives you full control over how documents are split, making it easy to tune chunk size, overlap and splitting behavior for your specific use case.

Three strategies are available, configurable via the `chunking_strategy` parameter on the Databricks job:

| Strategy | Default | Description |
|----------|---------|-------------|
| `semantic` | Yes | Splits on sentence boundaries, accumulates up to 512 tokens per chunk with 50-token overlap. Never cuts mid-sentence. Best general-purpose option. |
| `structure_aware` | No | Uses Document Intelligence layout data (headings, sections) to group text by document structure. Falls back to semantic chunking for oversized sections. Best for well-structured documents with clear headings. |
| `sliding_window` | No | Fixed 512-token window with 50-token overlap. Pure token-based, simple and predictable. Can cut mid-sentence. |

All strategies use `tiktoken` with `cl100k_base` encoding for token counting. To change the strategy, update the `chunking_strategy` widget default in `databricks/notebooks/02_chunking.py` or pass it as a job parameter.

**Citation System**
- Inline citation bubbles `[1]` `[2]` in every answer
- Hover to highlight source text and preview the reference -the enclosing paragraph is also highlighted to show exactly which part of the answer the citation supports
- Click to open an inline artifact panel (animated slide-in, pushes chat content aside) with a document viewer scrolled to the exact cited page

**Streaming**
- Real-time token-by-token streaming from FastAPI to the browser via SSE
- Vercel Streamdown for incremental markdown rendering with blur-in token animation
- Citations parsed and rendered as they stream in
- Reasoning model support: chain-of-thought is streamed via dedicated `thinking`/`thinking_done` SSE events and displayed in an expandable reasoning trace above the answer

**Document Management**
- Upload PDF, Word and TXT files through the web UI -each upload triggers the Databricks ingestion pipeline automatically
- Real-time processing status: the pipeline writes status updates back to PostgreSQL (`processing` → `indexed` / `failed`), and the UI auto-polls until all documents are ready -live spinner to green checkmark transition
- Delete a document and its blob, search index chunks and database records are all cleaned up in one operation

**Multi-Tenant Workspaces**
- Organization-based multi-tenancy: all documents, search results and chat history are scoped by organization
- BetterAuth with organization plugin for auth, session management and workspace switching
- New users get a personal workspace automatically on sign-up

**Evaluation**
- Custom LLM-as-judge pipeline using Mistral Large 3
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
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Vercel Streamdown, tRPC v11, TanStack Query v5, shadcn/ui |
| Auth & DB | BetterAuth (organization plugin), Drizzle ORM, Azure PostgreSQL |
| Backend | FastAPI, Python 3.9+, Pydantic |
| AI Services | Azure AI Foundry (Mistral Large 3, GPT-5 Nano, text-embedding-3-large), Azure AI Search, Azure Document Intelligence |
| Ingestion | Azure Databricks (premium tier), Databricks Asset Bundles, semantic chunking |
| Infrastructure | Terraform (all Azure resources incl. Databricks workspace), Azure Storage Account |
| Monorepo | Turborepo, npm workspaces, shared ESLint and TypeScript configs |

### Model Configuration

This project uses [Direct from Azure](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/models-sold-directly-by-azure) models -third-party models hosted and managed by Microsoft on Azure infrastructure. Unlike marketplace models (which require separate vendor agreements and portal-based consent flows), Direct from Azure models are purchased through Azure, deployed via Terraform and covered by a single Microsoft license.

The default chat model is **Mistral Large 3** (Mistral AI). You can swap it for any other Direct from Azure chat model by changing `chat_model_format` and `chat_model_name` in your `terraform.tfvars`:

```hcl
# Third-party models (available on all subscriptions)
chat_model_format = "Mistral AI"       # default
chat_model_name   = "Mistral-Large-3"  # default

chat_model_format = "DeepSeek"
chat_model_name   = "DeepSeek-V3.2"

chat_model_format = "MoonshotAI"
chat_model_name   = "Kimi-K2.5"

chat_model_format = "xAI"
chat_model_name   = "grok-4-fast-reasoning"

# OpenAI models (may require enterprise subscription for newer models)
chat_model_format = "OpenAI"
chat_model_name   = "gpt-5.2-chat"
```

Query rewriting uses **GPT-5 Nano** (OpenAI via Azure) with `reasoning_effort: low` for ultra-fast, low-latency inference. This lightweight model serves a dual purpose: it rewrites follow-up questions into standalone retrieval queries using conversation history, and it classifies user intent -detecting conversational messages (thanks, greetings, acknowledgements) so the RAG pipeline is skipped entirely. This avoids unnecessary embedding and search calls for non-retrieval messages, resulting in faster responses and more natural conversation flow.

Embeddings use **text-embedding-3-large** (OpenAI via Azure), which is also Direct from Azure.

## Project Structure

```
enterprise-rag-architecture/
  apps/
    api/          FastAPI backend (retrieval, generation, streaming)
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

The Databricks CLI authenticates automatically through your Azure login -no separate configuration needed. The setup script reads the workspace URL from Terraform and uses your Azure credentials.

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

The setup script handles everything: Terraform provisioning, `.env` file generation from Terraform outputs, database schema push, search index creation, Databricks secrets configuration and bundle deployment. It's idempotent and safe to re-run anytime.

`npm run dev` automatically checks that the Azure CLI is logged in before starting. All Azure services authenticate via `DefaultAzureCredential` -no API keys or connection strings needed in your `.env` files. Locally, this uses your `az login` session; in production, it uses Azure Managed Identity.

On first run, the script auto-generates a secure PostgreSQL password and stores it in `terraform/terraform.tfvars`. If you need the password later (e.g. for a database client), you can find it there.

### Azure Costs

The setup provisions paid Azure resources. The main cost driver is **Azure AI Search** which defaults to the `basic` SKU (~$75/month). This is required for semantic search and the built-in reranker. Semantic search is enabled on the `free` tier (1,000 queries/month at no extra cost on top of the basic SKU). For higher volumes, you can upgrade to `standard` in `terraform/terraform.tfvars`:

```hcl
# Semantic search tiers (set on the search service, separate from the SKU)
# free     -1,000 semantic queries/month (default)
# standard -unlimited, billed per 1,000 queries
```

Other resources (PostgreSQL, Storage, AI Foundry, Databricks) also incur costs based on usage. Review the defaults in `terraform/terraform.tfvars` before running the setup script. Remember to tear down resources with `cd terraform && terraform destroy` when you're done to avoid ongoing charges.

The FastAPI server starts at `http://localhost:4001` and the Next.js app at `http://localhost:4000`.

### Database Access (Local Development)

The Azure PostgreSQL server is protected by a firewall. During setup, Terraform automatically detects your public IP and adds a firewall rule so you can connect from your local machine. You'll see a message like:

```
[OK] PostgreSQL firewall: whitelisted your IP (203.0.113.42) for local development
```

If your IP changes (e.g. switching networks), re-run `./scripts/setup.sh` -it will update the firewall rule automatically. You can also manage firewall rules manually in the Azure Portal under your PostgreSQL Flexible Server > Networking.

## Deploying to Azure

This project is designed to run locally during development, with all backend services (AI, search, storage, database) already hosted on Azure. When you're ready to deploy the application itself, both apps map directly to Azure App Service:

| App | Azure Service | Runtime |
|-----|--------------|---------|
| `apps/web` (Next.js) | Azure App Service | Node.js |
| `apps/api` (FastAPI) | Azure App Service | Python |

**What you need to add:**

1. Two Azure App Service resources in Terraform (one Node.js, one Python)
2. Set the same environment variables from your `.env` files as App Service configuration
3. Optionally, an Azure Front Door or Application Gateway for routing both apps behind a single domain

**What already works:**

- The `AllowAzureServices` PostgreSQL firewall rule already permits connections from App Service -no IP whitelisting needed in production
- All other Azure services (AI Foundry, Search, Storage, Document Intelligence) are accessible from within the same tenant
- No code changes required -the same Next.js and FastAPI apps run as-is on App Service

## Security

Designed for enterprise environments where data privacy and compliance are non-negotiable.

- All documents and queries stay within your private Azure tenant
- Azure Databricks workspace runs inside your Azure subscription (not external SaaS)
- No data sent to public AI services or external logging
- RBAC with Azure Managed Identities via `DefaultAzureCredential` -zero API keys in code. Locally authenticates through `az login`, in production via Managed Identity. Terraform provisions all required role assignments automatically.
- Encryption at rest and in transit (TLS 1.2+)
- Input validation on all API endpoints via Pydantic
- On-demand document access via short-lived SAS tokens -no permanent public URLs. When viewing a cited document, the app generates a read-only Azure Blob Storage SAS URL scoped to that specific blob, valid for one hour. Expired tokens are never stored.

## License

MIT
