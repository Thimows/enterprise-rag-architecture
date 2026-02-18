output "endpoint" {
  value = azurerm_cognitive_account.ai_foundry.endpoint
}

output "resource_name" {
  value = azurerm_cognitive_account.ai_foundry.name
}

output "primary_key" {
  value     = azurerm_cognitive_account.ai_foundry.primary_access_key
  sensitive = true
}

output "chat_deployment_name" {
  value = var.chat_deployment_name
}

output "rewrite_deployment_name" {
  value = var.rewrite_deployment_name
}

output "embedding_deployment_name" {
  value = var.embedding_deployment_name
}

output "account_id" {
  value = azurerm_cognitive_account.ai_foundry.id
}
