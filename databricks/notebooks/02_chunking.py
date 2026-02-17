# Databricks notebook source

# COMMAND ----------
# MAGIC %md
# MAGIC # 02 - Chunking
# MAGIC
# MAGIC Reads parsed documents from Delta table (filtered by document_ids from the previous task),
# MAGIC applies the selected chunking strategy, and appends chunks to a Delta table.

# COMMAND ----------

dbutils.widgets.text("input_table", "rag_ingestion.parsed_documents", "Input Delta Table")
dbutils.widgets.text("output_table", "rag_ingestion.chunks", "Output Delta Table")
dbutils.widgets.dropdown("chunking_strategy", "semantic", ["semantic", "structure_aware", "sliding_window"], "Chunking Strategy")
dbutils.widgets.text("max_tokens", "512", "Max Tokens per Chunk")
dbutils.widgets.text("overlap_tokens", "50", "Overlap Tokens")

# COMMAND ----------

import sys
import json

sys.path.append("../")
from utils.chunking_strategies import (
    semantic_chunker,
    structure_aware_chunker,
    sliding_window_chunker,
)
from utils.quality_checks import validate_chunks

# COMMAND ----------

input_table = dbutils.widgets.get("input_table")
output_table = dbutils.widgets.get("output_table")
strategy = dbutils.widgets.get("chunking_strategy")
max_tokens = int(dbutils.widgets.get("max_tokens"))
overlap_tokens = int(dbutils.widgets.get("overlap_tokens"))

# COMMAND ----------

# Get document_ids and org/folder context from the previous task (parse_documents)
document_ids_raw = dbutils.jobs.taskValues.get(taskKey="parse_documents", key="document_ids", default="")
organization_id = dbutils.jobs.taskValues.get(taskKey="parse_documents", key="organization_id", default="")
folder_id = dbutils.jobs.taskValues.get(taskKey="parse_documents", key="folder_id", default="")

if not document_ids_raw:
    print("No document IDs received from parsing task, nothing to chunk")
    dbutils.jobs.taskValues.set(key="chunk_ids", value="")
    dbutils.notebook.exit(json.dumps({"status": "SUCCESS", "chunk_count": 0, "strategy": strategy}))

document_ids = [did.strip() for did in document_ids_raw.split(",") if did.strip()]
print(f"Chunking {len(document_ids)} documents")

# COMMAND ----------

df = spark.table(input_table).filter(spark.col("document_id").isin(document_ids))
documents = df.collect()
print(f"Read {len(documents)} documents from {input_table}")

# COMMAND ----------

all_chunks = []

for doc in documents:
    document_id = doc["document_id"]
    document_name = doc["document_name"]
    document_url = doc["document_url"]
    pages = json.loads(doc["pages_json"])

    doc_chunks = []

    if strategy == "structure_aware":
        all_layout = []
        full_text = ""
        for page in pages:
            all_layout.extend(page.get("layout", []))
            full_text += page["content"] + "\n\n"
        doc_chunks = structure_aware_chunker(full_text.strip(), all_layout, max_tokens=max_tokens)
    elif strategy == "sliding_window":
        for page in pages:
            if not page["content"].strip():
                continue
            page_chunks = sliding_window_chunker(
                page["content"],
                window_size=max_tokens,
                overlap=overlap_tokens,
                page_number=page["page_number"],
            )
            doc_chunks.extend(page_chunks)
    else:  # semantic (default)
        for page in pages:
            if not page["content"].strip():
                continue
            page_chunks = semantic_chunker(
                page["content"],
                max_tokens=max_tokens,
                overlap_tokens=overlap_tokens,
                page_number=page["page_number"],
            )
            doc_chunks.extend(page_chunks)

    # Re-index chunks sequentially for the entire document
    for i, chunk in enumerate(doc_chunks):
        chunk["chunk_index"] = i
        chunk["document_id"] = document_id
        chunk["document_name"] = document_name
        chunk["document_url"] = document_url
        chunk["id"] = f"{document_id}_chunk_{i}"
        chunk["metadata"] = json.dumps(chunk.get("metadata", {}))
        chunk["organization_id"] = doc.get("organization_id", organization_id) or organization_id
        chunk["folder_id"] = doc.get("folder_id", folder_id) or folder_id

    is_valid, errors = validate_chunks(doc_chunks, max_tokens=max_tokens + 50)
    if not is_valid:
        print(f"  WARNING: Chunk validation issues for {document_name}: {errors[:3]}")

    all_chunks.extend(doc_chunks)

print(f"Generated {len(all_chunks)} chunks using '{strategy}' strategy")

# COMMAND ----------

chunk_df = spark.createDataFrame(all_chunks)
chunk_df.write.mode("append").saveAsTable(output_table)

chunk_ids = [chunk["id"] for chunk in all_chunks]
dbutils.jobs.taskValues.set(key="chunk_ids", value=",".join(chunk_ids))
dbutils.jobs.taskValues.set(key="organization_id", value=organization_id)
dbutils.jobs.taskValues.set(key="folder_id", value=folder_id)

print(f"Appended {len(all_chunks)} chunks to {output_table}")

# COMMAND ----------

dbutils.notebook.exit(json.dumps({"status": "SUCCESS", "chunk_count": len(all_chunks), "strategy": strategy}))
