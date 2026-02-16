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

# ─── Check Databricks auth ──────────────────────────────────────────
if databricks auth describe &>/dev/null 2>&1; then
  ok "Databricks: configured"
else
  warn "Databricks CLI is not configured."
  echo ""
  echo "  Run this command to configure:"
  echo "    databricks configure"
  echo ""
  echo "  You will be prompted for:"
  echo "    Host:  Your workspace URL (https://<workspace>.cloud.databricks.com)"
  echo "    Token: Generate one in Databricks → User icon → Settings → Developer → Access tokens"
  echo ""
  err "Configure Databricks, then re-run this script."
fi

# ─── Step 1: Terraform ──────────────────────────────────────────────
info "Step 1/4 — Provisioning Azure resources with Terraform..."

cd "$ROOT_DIR/terraform"

if [ ! -f terraform.tfvars ]; then
  echo ""
  echo "  No terraform.tfvars found. The following defaults will be used:"
  echo ""
  echo "    Resource group       = rg-enterprise-rag"
  echo "    Location             = swedencentral"
  echo "    Storage account      = stenterpriserag"
  echo ""
  echo "    Chat model           = Claude Sonnet 4.5 (Anthropic)"
  echo "    Embedding model      = text-embedding-3-large (v1)"
  echo "    Search SKU           = free"
  echo ""
  read -rp "Press Enter to continue with defaults, or Ctrl+C to edit terraform.tfvars.example first... "
  cp terraform.tfvars.example terraform.tfvars
  ok "Created terraform.tfvars"
fi

info "Running terraform init..."
terraform init -input=false
echo ""
info "Creating Azure resources (this can take 3-5 minutes)..."
terraform apply -auto-approve

ok "Azure resources provisioned"

# ─── Step 2: Generate .env files from Terraform outputs ─────────────
info "Step 2/4 — Generating .env files from Terraform outputs..."

get_output() {
  terraform output -raw "$1" 2>/dev/null
}

# apps/api/.env
cat > "$ROOT_DIR/apps/api/.env" <<EOF
AZURE_AI_ENDPOINT=$(get_output azure_ai_endpoint)
AZURE_AI_RESOURCE_NAME=$(get_output azure_ai_resource_name)
AZURE_AI_KEY=$(get_output azure_ai_key)
AZURE_AI_CHAT_DEPLOYMENT=$(get_output azure_ai_chat_deployment)
AZURE_AI_EMBEDDING_DEPLOYMENT=$(get_output azure_ai_embedding_deployment)

AZURE_SEARCH_ENDPOINT=$(get_output azure_search_endpoint)
AZURE_SEARCH_API_KEY=$(get_output azure_search_key)
AZURE_SEARCH_INDEX_NAME=rag-index

AZURE_STORAGE_CONNECTION_STRING=$(get_output storage_connection_string)
AZURE_STORAGE_CONTAINER_NAME=documents

AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=$(get_output document_intelligence_endpoint)
AZURE_DOCUMENT_INTELLIGENCE_KEY=$(get_output document_intelligence_key)

CORS_ORIGINS=["http://localhost:3000"]
EOF
ok "Created apps/api/.env"

# apps/web/.env.local
cat > "$ROOT_DIR/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
EOF
ok "Created apps/web/.env.local"

# ─── Step 3: Databricks secrets ─────────────────────────────────────
info "Step 3/4 — Configuring Databricks secrets (writing 10 secrets)..."

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

ok "All 10 secrets configured"

# ─── Step 4: Deploy Databricks bundle ───────────────────────────────
info "Step 4/4 — Deploying Databricks bundle (this can take a minute)..."

cd "$ROOT_DIR/databricks"
databricks bundle deploy --target dev

ok "Databricks bundle deployed"

# ─── Done ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  Start development:"
echo "    npm run dev"
echo ""
echo "  FastAPI  → http://localhost:8000"
echo "  Next.js  → http://localhost:3000"
echo "  API docs → http://localhost:8000/docs"
echo ""
echo "  To run the ingestion pipeline:"
echo "    databricks bundle run create_search_index_job --target dev"
echo "    databricks bundle run document_ingestion_job --target dev"
echo ""
