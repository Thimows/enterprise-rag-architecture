variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "swedencentral"
}

variable "chat_model_name" {
  description = "Name of the chat model to deploy"
  type        = string
  default     = "claude-sonnet-4-5"
}

variable "embedding_model_name" {
  description = "Name of the embedding model to deploy"
  type        = string
  default     = "text-embedding-3-large"
}

variable "search_service_sku" {
  description = "SKU tier for Azure AI Search"
  type        = string
  default     = "free"
}

variable "storage_account_name" {
  description = "Name of the Azure Storage account (must be globally unique)"
  type        = string
}

variable "project_prefix" {
  description = "Prefix for resource naming"
  type        = string
  default     = "rag"
}
