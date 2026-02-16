variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "project_prefix" {
  type = string
}

variable "chat_model_name" {
  description = "Chat model to deploy (Anthropic)"
  type        = string
  default     = "claude-sonnet-4-5"
}

variable "chat_model_version" {
  description = "Chat model version"
  type        = string
  default     = "latest"
}

variable "chat_deployment_name" {
  description = "Deployment name for the chat model"
  type        = string
  default     = "claude-sonnet-4-5"
}

variable "embedding_model_name" {
  description = "Embedding model to deploy"
  type        = string
  default     = "text-embedding-3-large"
}

variable "embedding_model_version" {
  description = "Embedding model version"
  type        = string
  default     = "1"
}

variable "embedding_deployment_name" {
  description = "Deployment name for the embedding model"
  type        = string
  default     = "text-embedding-3-large"
}
