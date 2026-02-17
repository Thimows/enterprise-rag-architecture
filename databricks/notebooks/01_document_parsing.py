# Databricks notebook source

# COMMAND ----------
# MAGIC %md
# MAGIC # 01 - Document Parsing
# MAGIC
# MAGIC Reads documents from Azure Blob Storage, parses them via Azure Document Intelligence,
# MAGIC and appends parsed results to a Delta table. Only processes the documents specified
# MAGIC in the `document_names` parameter (or all documents if empty).

# COMMAND ----------

dbutils.widgets.text("storage_container", "documents", "Storage Container Name")
dbutils.widgets.text("secrets_scope", "rag-ingestion", "Databricks Secrets Scope")
dbutils.widgets.text("output_table", "rag_ingestion.parsed_documents", "Output Delta Table")
dbutils.widgets.text("document_names", "", "Comma-separated blob names to process (empty = all)")
dbutils.widgets.text("organization_id", "", "Organization ID")
dbutils.widgets.text("folder_id", "", "Folder ID")

# COMMAND ----------

import sys
import json
import uuid
from datetime import datetime, timezone

sys.path.append("../")
from utils.azure_clients import get_document_analysis_client, get_blob_service_client
from utils.quality_checks import validate_parsed_document

# COMMAND ----------

container_name = dbutils.widgets.get("storage_container")
output_table = dbutils.widgets.get("output_table")
document_names_raw = dbutils.widgets.get("document_names").strip()
organization_id = dbutils.widgets.get("organization_id").strip()
folder_id = dbutils.widgets.get("folder_id").strip()

blob_client = get_blob_service_client()
doc_intel_client = get_document_analysis_client()
container_client = blob_client.get_container_client(container_name)

# COMMAND ----------

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}

if document_names_raw:
    # Process only the specified documents
    target_names = [name.strip() for name in document_names_raw.split(",") if name.strip()]
    blobs = []
    for name in target_names:
        ext = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if ext not in SUPPORTED_EXTENSIONS:
            print(f"Skipping unsupported file: {name}")
            continue
        blob = container_client.get_blob_client(name).get_blob_properties()
        blobs.append(blob)
    print(f"Processing {len(blobs)} specified documents")
else:
    # Process all documents in the container
    blobs = []
    for blob in container_client.list_blobs():
        ext = "." + blob.name.rsplit(".", 1)[-1].lower() if "." in blob.name else ""
        if ext in SUPPORTED_EXTENSIONS:
            blobs.append(blob)
    print(f"Processing all {len(blobs)} documents in container")

if not blobs:
    print("No documents to process")
    dbutils.jobs.taskValues.set(key="document_ids", value="")
    dbutils.notebook.exit(json.dumps({"status": "SUCCESS", "document_count": 0}))

# COMMAND ----------

parsed_documents = []

for blob in blobs:
    document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, blob.name))
    print(f"Processing: {blob.name} (id: {document_id})")

    # Extract organization_id and folder_id from blob path ({org_id}/{folder_id}/{filename})
    path_parts = blob.name.split("/")
    if len(path_parts) >= 3 and not organization_id:
        blob_org_id = path_parts[0]
        blob_folder_id = path_parts[1]
    else:
        blob_org_id = organization_id
        blob_folder_id = folder_id

    blob_data = container_client.download_blob(blob.name).readall()
    ext = blob.name.rsplit(".", 1)[-1].lower()

    if ext == "txt":
        content = blob_data.decode("utf-8")
        parsed_doc = {
            "document_id": document_id,
            "document_name": blob.name,
            "document_url": f"https://{blob_client.account_name}.blob.core.windows.net/{container_name}/{blob.name}",
            "content": content,
            "pages": [{"page_number": 1, "content": content, "layout": []}],
            "page_count": 1,
            "parsed_at": datetime.now(timezone.utc).isoformat(),
            "organization_id": blob_org_id,
            "folder_id": blob_folder_id,
        }
    else:
        content_type = (
            "application/pdf" if ext == "pdf"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        poller = doc_intel_client.begin_analyze_document(
            "prebuilt-layout",
            document=blob_data,
            content_type=content_type,
        )
        result = poller.result()

        pages_data = []
        for page in result.pages or []:
            page_content = ""
            page_layout = []
            for paragraph in result.paragraphs or []:
                if any(br.page_number == page.page_number for br in (paragraph.bounding_regions or [])):
                    page_content += paragraph.content + "\n"
                    page_layout.append({
                        "content": paragraph.content,
                        "role": getattr(paragraph, "role", None),
                        "bounding_regions": [
                            {"page_number": br.page_number}
                            for br in (paragraph.bounding_regions or [])
                        ],
                    })
            pages_data.append({
                "page_number": page.page_number,
                "content": page_content.strip(),
                "layout": page_layout,
            })

        full_content = "\n\n".join(p["content"] for p in pages_data if p["content"])

        parsed_doc = {
            "document_id": document_id,
            "document_name": blob.name,
            "document_url": f"https://{blob_client.account_name}.blob.core.windows.net/{container_name}/{blob.name}",
            "content": full_content,
            "pages": pages_data,
            "page_count": len(pages_data),
            "parsed_at": datetime.now(timezone.utc).isoformat(),
            "organization_id": blob_org_id,
            "folder_id": blob_folder_id,
        }

    is_valid, errors = validate_parsed_document(parsed_doc)
    if not is_valid:
        print(f"  WARNING: Validation issues for {blob.name}: {errors}")

    parsed_documents.append(parsed_doc)

print(f"Parsed {len(parsed_documents)} documents successfully")

# COMMAND ----------

for doc in parsed_documents:
    doc["pages_json"] = json.dumps(doc["pages"])
    del doc["pages"]

df = spark.createDataFrame(parsed_documents)
df.write.mode("append").saveAsTable(output_table)

document_ids = [doc["document_id"] for doc in parsed_documents]
dbutils.jobs.taskValues.set(key="document_ids", value=",".join(document_ids))
dbutils.jobs.taskValues.set(key="organization_id", value=organization_id)
dbutils.jobs.taskValues.set(key="folder_id", value=folder_id)

print(f"Appended {len(parsed_documents)} parsed documents to {output_table}")

# COMMAND ----------

dbutils.notebook.exit(json.dumps({"status": "SUCCESS", "document_count": len(parsed_documents)}))
