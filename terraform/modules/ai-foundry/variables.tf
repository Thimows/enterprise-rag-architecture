variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "project_prefix" {
  type = string
}

variable "chat_deployment_name" {
  description = "Deployment name for the chat model"
  type        = string
  default     = "Mistral-Large-3"
}

variable "chat_model_format" {
  description = "Model provider format (e.g. 'Mistral AI', 'OpenAI', 'DeepSeek', 'MoonshotAI')"
  type        = string
  default     = "Mistral AI"
}

variable "chat_model_name" {
  description = "Chat model to deploy"
  type        = string
  default     = "Mistral-Large-3"
}

variable "chat_model_version" {
  description = "Chat model version"
  type        = string
  default     = "1"
}

variable "rewrite_deployment_name" {
  description = "Deployment name for the query rewriting model"
  type        = string
  default     = "gpt-5-nano"
}

variable "rewrite_model_name" {
  description = "Query rewriting model to deploy"
  type        = string
  default     = "gpt-5-nano"
}

variable "rewrite_model_version" {
  description = "Query rewriting model version"
  type        = string
  default     = "2025-08-07"
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
