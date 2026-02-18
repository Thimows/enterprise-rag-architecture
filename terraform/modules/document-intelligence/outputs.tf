output "endpoint" {
  value = azurerm_cognitive_account.document_intelligence.endpoint
}

output "primary_key" {
  value     = azurerm_cognitive_account.document_intelligence.primary_access_key
  sensitive = true
}

output "account_id" {
  value = azurerm_cognitive_account.document_intelligence.id
}
