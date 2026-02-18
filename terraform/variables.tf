variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "swedencentral"
}

variable "embedding_model_name" {
  description = "Name of the embedding model to deploy"
  type        = string
  default     = "text-embedding-3-large"
}

variable "chat_capacity" {
  description = "Chat model capacity in thousands of tokens per minute (e.g. 20 = 20K TPM)"
  type        = number
  default     = 20
}

variable "rewrite_capacity" {
  description = "Rewrite model capacity in thousands of tokens per minute (e.g. 30 = 30K TPM)"
  type        = number
  default     = 30
}

variable "embedding_capacity" {
  description = "Embedding model capacity in thousands of tokens per minute (e.g. 350 = 350K TPM)"
  type        = number
  default     = 350
}

variable "search_service_sku" {
  description = "SKU tier for Azure AI Search (basic required for semantic search)"
  type        = string
  default     = "basic"
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

variable "databricks_sku" {
  description = "SKU tier for Azure Databricks workspace (standard, premium, or trial)"
  type        = string
  default     = "premium"
}

variable "postgresql_server_name" {
  description = "Name prefix for the PostgreSQL Flexible Server"
  type        = string
  default     = "rag-pg"
}

variable "postgresql_admin_password" {
  description = "Administrator password for PostgreSQL Flexible Server"
  type        = string
  sensitive   = true
}

