output "endpoint" {
  value = "https://${azurerm_search_service.search.name}.search.windows.net"
}

output "primary_key" {
  value     = azurerm_search_service.search.primary_key
  sensitive = true
}

output "service_id" {
  value = azurerm_search_service.search.id
}
