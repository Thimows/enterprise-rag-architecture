resource "azurerm_cognitive_account" "document_intelligence" {
  name                  = "${var.project_prefix}-doc-intelligence"
  location              = var.location
  resource_group_name   = var.resource_group_name
  kind                  = "FormRecognizer"
  sku_name              = "S0"
  custom_subdomain_name = "${var.project_prefix}-doc-intelligence"
}
