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

resource "azurerm_cognitive_account_project" "project" {
  name                 = "${var.project_prefix}-project"
  cognitive_account_id = azurerm_cognitive_account.ai_foundry.id
  location             = var.location

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_cognitive_deployment" "chat" {
  name                 = var.chat_deployment_name
  cognitive_account_id = azurerm_cognitive_account.ai_foundry.id

  model {
    format  = var.chat_model_format
    name    = var.chat_model_name
    version = var.chat_model_version
  }

  sku {
    name     = "GlobalStandard"
    capacity = 1
  }
}

resource "azurerm_cognitive_deployment" "embedding" {
  name                 = var.embedding_deployment_name
  cognitive_account_id = azurerm_cognitive_account.ai_foundry.id

  depends_on = [azurerm_cognitive_deployment.chat]

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
