# Databricks notebook source

# COMMAND ----------
# MAGIC %md
# MAGIC # 03 — Embedding Generation
# MAGIC
# MAGIC Reads chunks from Delta table, generates embeddings via Azure AI Foundry in batches,
# MAGIC and writes the embeddings back alongside the chunk data.

# COMMAND ----------

dbutils.widgets.text("input_table", "rag_ingestion.chunks", "Input Chunks Table")
dbutils.widgets.text("output_table", "rag_ingestion.chunks_with_embeddings", "Output Table")
dbutils.widgets.text("secrets_scope", "rag-ingestion", "Databricks Secrets Scope")
dbutils.widgets.text("batch_size", "100", "Embedding Batch Size")
dbutils.widgets.text("max_retries", "3", "Max Retries per Batch")
dbutils.widgets.text("embedding_dimensions", "3072", "Expected Embedding Dimensions")

# COMMAND ----------

import sys
import json
import time

sys.path.append("../")
from utils.azure_clients import get_embeddings_client
from utils.quality_checks import validate_embeddings

# COMMAND ----------

input_table = dbutils.widgets.get("input_table")
output_table = dbutils.widgets.get("output_table")
batch_size = int(dbutils.widgets.get("batch_size"))
max_retries = int(dbutils.widgets.get("max_retries"))
expected_dims = int(dbutils.widgets.get("embedding_dimensions"))

# COMMAND ----------

client = get_embeddings_client()

# COMMAND ----------

df = spark.table(input_table)
chunks = df.collect()
print(f"Generating embeddings for {len(chunks)} chunks")

# COMMAND ----------

def generate_embeddings_batch(texts: list[str], retries: int = 0) -> list[list[float]]:
    """Generate embeddings for a batch with retry logic and rate limiting."""
    try:
        response = client.embed(
            input=texts,
        )
        embeddings = [item.embedding for item in response.data]

        for emb in embeddings:
            if len(emb) != expected_dims:
                raise ValueError(f"Expected {expected_dims} dimensions, got {len(emb)}")

        return embeddings

    except Exception as e:
        if retries < max_retries:
            wait_time = (2 ** retries) * 1.0
            error_str = str(e)
            if "429" in error_str or "rate" in error_str.lower():
                wait_time = max(wait_time, 10.0)
            print(f"  Retry {retries + 1}/{max_retries} after {wait_time}s: {error_str[:100]}")
            time.sleep(wait_time)
            return generate_embeddings_batch(texts, retries + 1)
        raise

# COMMAND ----------

all_results = []
total_batches = (len(chunks) + batch_size - 1) // batch_size

for batch_idx in range(total_batches):
    start = batch_idx * batch_size
    end = min(start + batch_size, len(chunks))
    batch_chunks = chunks[start:end]
    batch_texts = [row["content"] for row in batch_chunks]

    print(f"  Batch {batch_idx + 1}/{total_batches} ({len(batch_texts)} chunks)")

    embeddings = generate_embeddings_batch(batch_texts)

    is_valid, errors = validate_embeddings(embeddings, expected_dim=expected_dims)
    if not is_valid:
        print(f"    WARNING: Embedding validation issues: {errors}")

    for i, row in enumerate(batch_chunks):
        result = row.asDict()
        result["content_vector"] = embeddings[i]
        all_results.append(result)

    if batch_idx < total_batches - 1:
        time.sleep(0.5)

print(f"Generated embeddings for {len(all_results)} chunks")

# COMMAND ----------

result_df = spark.createDataFrame(all_results)
result_df.write.mode("overwrite").saveAsTable(output_table)

print(f"Wrote {result_df.count()} chunks with embeddings to {output_table}")

# COMMAND ----------

dbutils.notebook.exit(json.dumps({"status": "SUCCESS", "embedded_count": len(all_results)}))
