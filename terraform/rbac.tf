data "azurerm_client_config" "current" {}

# AI Foundry — chat, embeddings, rewrite
resource "azurerm_role_assignment" "ai_foundry_user" {
  scope                = module.ai_foundry.account_id
  role_definition_name = "Cognitive Services User"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Search — manage indexes + read/write index data
resource "azurerm_role_assignment" "search_service_contributor" {
  scope                = module.azure_search.service_id
  role_definition_name = "Search Service Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "search_index_data_reader" {
  scope                = module.azure_search.service_id
  role_definition_name = "Search Index Data Reader"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "search_index_data_contributor" {
  scope                = module.azure_search.service_id
  role_definition_name = "Search Index Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Storage — blob CRUD + user delegation SAS
resource "azurerm_role_assignment" "storage_blob_data_contributor" {
  scope                = module.storage.account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "storage_blob_delegator" {
  scope                = module.storage.account_id
  role_definition_name = "Storage Blob Delegator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Document Intelligence
resource "azurerm_role_assignment" "doc_intelligence_user" {
  scope                = module.document_intelligence.account_id
  role_definition_name = "Cognitive Services User"
  principal_id         = data.azurerm_client_config.current.object_id
}
