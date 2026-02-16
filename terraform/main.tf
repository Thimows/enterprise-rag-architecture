resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

resource "random_id" "suffix" {
  byte_length = 4
}

module "ai_foundry" {
  source = "./modules/ai-foundry"

  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  project_prefix       = var.project_prefix
  chat_model_name      = var.chat_model_name
  embedding_model_name = var.embedding_model_name
}

module "azure_search" {
  source = "./modules/azure-search"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  project_prefix      = "${var.project_prefix}-${random_id.suffix.hex}"
  sku                 = var.search_service_sku
}

module "storage" {
  source = "./modules/storage"

  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  storage_account_name = var.storage_account_name
}

module "document_intelligence" {
  source = "./modules/document-intelligence"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  project_prefix      = var.project_prefix
}
