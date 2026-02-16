output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "azure_ai_endpoint" {
  value = module.ai_foundry.endpoint
}

output "azure_ai_resource_name" {
  value = module.ai_foundry.resource_name
}

output "azure_ai_key" {
  value     = module.ai_foundry.primary_key
  sensitive = true
}

output "azure_ai_chat_deployment" {
  value = module.ai_foundry.chat_deployment_name
}

output "azure_ai_embedding_deployment" {
  value = module.ai_foundry.embedding_deployment_name
}

output "azure_search_endpoint" {
  value = module.azure_search.endpoint
}

output "azure_search_key" {
  value     = module.azure_search.primary_key
  sensitive = true
}

output "storage_connection_string" {
  value     = module.storage.connection_string
  sensitive = true
}

output "storage_account_name" {
  value = module.storage.account_name
}

output "document_intelligence_endpoint" {
  value = module.document_intelligence.endpoint
}

output "document_intelligence_key" {
  value     = module.document_intelligence.primary_key
  sensitive = true
}
