#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Preflight checks ───────────────────────────────────────────────
info "Checking prerequisites..."

IS_MAC=false
[[ "$(uname)" == "Darwin" ]] && IS_MAC=true

check_cmd() {
  local cmd=$1 brew_pkg=$2 winget_pkg=$3
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}[MISSING]${NC} '$cmd' is not installed. Install it with:"
    if $IS_MAC; then
      echo "    brew install $brew_pkg"
    else
      echo "    winget install $winget_pkg"
    fi
    return 1
  fi
}

MISSING=0
check_cmd node       node              OpenJS.NodeJS           || MISSING=1
check_cmd python3    python            Python.Python.3.12      || MISSING=1
check_cmd uv         uv                astral-sh.uv            || MISSING=1
check_cmd terraform  terraform         Hashicorp.Terraform     || MISSING=1
check_cmd az         azure-cli         Microsoft.AzureCLI      || MISSING=1
check_cmd databricks "databricks/tap/databricks" Databricks.DatabricksCLI || MISSING=1

[[ $MISSING -eq 1 ]] && err "Install the missing tools above, then re-run this script."
ok "All CLI tools found"

# ─── Check Azure login ──────────────────────────────────────────────
echo ""
if az account show &>/dev/null 2>&1; then
  SUBSCRIPTION=$(az account show --query name -o tsv)
  ok "Azure: logged in ($SUBSCRIPTION)"
else
  warn "Azure CLI is not logged in."
  echo ""
  echo "  Run this command to log in:"
  echo "    az login"
  echo ""
  err "Log in to Azure, then re-run this script."
fi

# ─── Step 0: Install dependencies ──────────────────────────────────
info "Installing dependencies..."

cd "$ROOT_DIR"
npm install
ok "Node.js dependencies installed"

cd "$ROOT_DIR/apps/api"
uv sync --prerelease=allow
ok "Python dependencies installed"

# ─── Step 1: Terraform ──────────────────────────────────────────────
info "Step 1/6 — Provisioning Azure resources with Terraform..."

cd "$ROOT_DIR/terraform"

if [ ! -f terraform.tfvars ]; then
  echo ""
  echo "  No terraform.tfvars found. The following defaults will be used:"
  echo ""
  echo "    Resource group       = rg-enterprise-rag"
  echo "    Location             = swedencentral"
  echo "    Storage account      = stenterpriserag"
  echo "    Databricks SKU       = premium"
  echo ""
  echo "    PostgreSQL password   = (auto-generated, saved in terraform.tfvars)"
  echo ""
  echo "    Chat model           = Mistral Large 3 (Mistral AI)"
  echo "    Query rewrite model  = GPT-5 Nano (OpenAI)"
  echo "    Embedding model      = text-embedding-3-large (v1)"
  echo "    Search SKU           = basic (~\$75/month, required for semantic search)"
  echo ""
  echo -e "  ${YELLOW}NOTE:${NC} Your public IP will be auto-detected and whitelisted in the"
  echo "  PostgreSQL firewall for local development. If you are on a VPN, consider"
  echo "  turning it off so we detect the right IP. If your IP changes later,"
  echo "  just re-run this script to update the firewall rule."
  echo ""
  read -rp "Press Enter to continue with defaults, or Ctrl+C to edit terraform.tfvars.example first... "
  PG_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  sed "s/your-secure-password/$PG_PASSWORD/" terraform.tfvars.example > terraform.tfvars
  ok "Created terraform.tfvars (PostgreSQL password auto-generated)"
fi

info "Running terraform init..."
terraform init -input=false
echo ""
info "Creating Azure resources (this can take 10-15 minutes)..."
terraform apply -auto-approve

ok "Azure resources provisioned"

get_output() {
  terraform -chdir="$ROOT_DIR/terraform" output -raw "$1" 2>/dev/null
}

DEV_IP=$(get_output dev_ip)
ok "PostgreSQL firewall: whitelisted your IP ($DEV_IP) for local development"
info "  In production, Azure services connect via the AllowAzureServices rule."
info "  If your IP changes, re-run this script or update the firewall in the Azure Portal."
echo ""

# ─── Step 2: Generate .env files from Terraform outputs ─────────────
info "Step 2/6 — Generating .env files from Terraform outputs..."

# apps/api/.env
cat > "$ROOT_DIR/apps/api/.env" <<EOF
AZURE_AI_ENDPOINT=$(get_output azure_ai_endpoint)
AZURE_AI_RESOURCE_NAME=$(get_output azure_ai_resource_name)
AZURE_AI_CHAT_DEPLOYMENT=$(get_output azure_ai_chat_deployment)
AZURE_AI_REWRITE_DEPLOYMENT=$(get_output azure_ai_rewrite_deployment)
AZURE_AI_EMBEDDING_DEPLOYMENT=$(get_output azure_ai_embedding_deployment)

AZURE_SEARCH_ENDPOINT=$(get_output azure_search_endpoint)
AZURE_SEARCH_INDEX_NAME=rag-index

AZURE_STORAGE_ACCOUNT_NAME=$(get_output storage_account_name)
AZURE_STORAGE_CONTAINER_NAME=documents

AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=$(get_output document_intelligence_endpoint)

CORS_ORIGINS=["http://localhost:4000"]

DATABASE_URL=postgresql://$(get_output postgresql_user):$(get_output postgresql_password)@$(get_output postgresql_host):5432/$(get_output postgresql_database)?sslmode=require
EOF
ok "Created apps/api/.env"

# apps/web/.env.local
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
cat > "$ROOT_DIR/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
DATABASE_URL=postgresql://$(get_output postgresql_user):$(get_output postgresql_password)@$(get_output postgresql_host):5432/$(get_output postgresql_database)?sslmode=require
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
BETTER_AUTH_URL=http://localhost:4000
AZURE_STORAGE_ACCOUNT_NAME=$(get_output storage_account_name)
AZURE_STORAGE_CONTAINER_NAME=documents
EOF
ok "Created apps/web/.env.local"

# ─── Step 3: Push database schema ─────────────────────────────────
info "Step 3/6 — Pushing database schema..."
cd "$ROOT_DIR/apps/web"
DB_URL="postgresql://$(get_output postgresql_user):$(get_output postgresql_password)@$(get_output postgresql_host):5432/$(get_output postgresql_database)?sslmode=require"
DATABASE_URL="$DB_URL" npx drizzle-kit push < /dev/null
ok "Database schema up to date"

# ─── Step 4: Create search index ──────────────────────────────────
info "Step 4/6 — Creating Azure AI Search index..."
info "  (RBAC role assignments may take a few minutes to propagate)"

cd "$ROOT_DIR/apps/api"
MAX_RETRIES=6
RETRY_DELAY=30
for i in $(seq 1 $MAX_RETRIES); do
  if uv run python scripts/create_search_index.py 2>&1; then
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    err "Failed to create search index after $MAX_RETRIES attempts. Try again later: cd apps/api && uv run python scripts/create_search_index.py"
  fi
  warn "RBAC not yet propagated, retrying in ${RETRY_DELAY}s... ($i/$MAX_RETRIES)"
  sleep $RETRY_DELAY
done
ok "Search index created/updated"

# ─── Step 5: Databricks secrets ─────────────────────────────────────
cd "$ROOT_DIR/terraform"
info "Step 5/6 — Configuring Databricks secrets (writing 10 secrets)..."

# Authenticate Databricks CLI using the Azure-managed workspace
DATABRICKS_HOST=$(get_output databricks_workspace_url)
DATABRICKS_TOKEN=$(az account get-access-token --resource 2ff814a6-3304-4ab8-85cb-cd0e6f879c1d --query accessToken -o tsv)
export DATABRICKS_HOST DATABRICKS_TOKEN
ok "Databricks: authenticated via Azure CLI (${DATABRICKS_HOST})"

SCOPE="rag-ingestion"

# Create scope if it doesn't exist
if databricks secrets list-scopes 2>/dev/null | grep -q "$SCOPE"; then
  ok "Secrets scope '$SCOPE' already exists"
else
  databricks secrets create-scope "$SCOPE"
  ok "Created secrets scope '$SCOPE'"
fi

put_secret() {
  databricks secrets put-secret "$SCOPE" "$1" --string-value "$2"
}

put_secret "azure-ai-endpoint"                  "$(get_output azure_ai_endpoint)"
put_secret "azure-ai-key"                       "$(get_output azure_ai_key)"
put_secret "azure-ai-resource-name"             "$(get_output azure_ai_resource_name)"
put_secret "azure-ai-embedding-deployment"      "$(get_output azure_ai_embedding_deployment)"
put_secret "azure-search-endpoint"              "$(get_output azure_search_endpoint)"
put_secret "azure-search-key"                   "$(get_output azure_search_key)"
put_secret "azure-search-index-name"            "rag-index"
put_secret "azure-storage-connection-string"    "$(get_output storage_connection_string)"
put_secret "document-intelligence-endpoint"     "$(get_output document_intelligence_endpoint)"
put_secret "document-intelligence-key"          "$(get_output document_intelligence_key)"
put_secret "DATABASE_URL"                       "postgresql://$(get_output postgresql_user):$(get_output postgresql_password)@$(get_output postgresql_host):5432/$(get_output postgresql_database)?sslmode=require"

ok "All 11 secrets configured"

# ─── Step 6: Deploy Databricks bundle ───────────────────────────────
info "Step 6/6 — Deploying Databricks bundle (this can take a minute)..."

cd "$ROOT_DIR/databricks"
databricks bundle deploy --target dev

ok "Databricks bundle deployed"

# Retrieve the job ID for the ingestion job we just deployed
info "Retrieving Databricks job ID..."
INGESTION_JOB_ID=$(databricks jobs list --output json 2>/dev/null | jq -r '
  (if type == "object" then .jobs // [] else . end)
  | map(select(.settings.name | test("RAG Document Ingestion")))
  | .[0].job_id // empty
' 2>/dev/null || echo "")

if [[ -z "$INGESTION_JOB_ID" || "$INGESTION_JOB_ID" == "null" ]]; then
  INGESTION_JOB_ID=""
  warn "Could not find ingestion job ID — set DATABRICKS_JOB_ID manually in apps/api/.env"
else
  ok "Ingestion job ID: $INGESTION_JOB_ID"
fi

# Create a long-lived PAT for the FastAPI app to trigger jobs
info "Creating Databricks Personal Access Token for API..."
DATABRICKS_PAT=$(databricks tokens create --comment "enterprise-rag-api" --lifetime-seconds 7776000 2>/dev/null | jq -r '.token_value // empty' 2>/dev/null || echo "")

if [[ -z "$DATABRICKS_PAT" ]]; then
  warn "Could not create PAT — set DATABRICKS_TOKEN manually in apps/api/.env"
  DATABRICKS_PAT=""
else
  ok "PAT created"
fi

# Append Databricks settings to apps/api/.env
cat >> "$ROOT_DIR/apps/api/.env" <<EOF

# Databricks
DATABRICKS_HOST=${DATABRICKS_HOST:-}
DATABRICKS_TOKEN=${DATABRICKS_PAT}
DATABRICKS_JOB_ID=${INGESTION_JOB_ID}
EOF
ok "Databricks settings added to apps/api/.env"

# ─── Done ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  Start development:"
echo "    npm run dev"
echo ""
echo "  FastAPI  → http://localhost:4001"
echo "  Next.js  → http://localhost:4000"
echo "  API docs → http://localhost:4001/docs"
echo ""
echo "  Upload documents through the web UI at http://localhost:4000"
echo "  The ingestion pipeline runs automatically via Azure Databricks."
echo ""
