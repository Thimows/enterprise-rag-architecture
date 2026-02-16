resource "azurerm_cognitive_account" "ai_foundry" {
  name                       = "${var.project_prefix}-ai-foundry"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  kind                       = "AIServices"
  sku_name                   = "S0"
  custom_subdomain_name      = "${var.project_prefix}-ai-foundry"
  project_management_enabled = true

  identity {
    type = "SystemAssigned"
  }
}

resource "azapi_resource" "claude_chat" {
  type      = "Microsoft.CognitiveServices/accounts/deployments@2024-10-01"
  name      = var.chat_deployment_name
  parent_id = azurerm_cognitive_account.ai_foundry.id

  body = {
    sku = {
      name     = "GlobalStandard"
      capacity = 1
    }
    properties = {
      model = {
        format  = "Anthropic"
        name    = var.chat_model_name
        version = var.chat_model_version
      }
    }
  }
}

resource "azurerm_cognitive_deployment" "embedding" {
  name                 = var.embedding_deployment_name
  cognitive_account_id = azurerm_cognitive_account.ai_foundry.id

  model {
    format  = "OpenAI"
    name    = var.embedding_model_name
    version = var.embedding_model_version
  }

  sku {
    name     = "Standard"
    capacity = 10
  }
}
