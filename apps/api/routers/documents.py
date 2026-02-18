import logging
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, Query, UploadFile

from config.settings import settings
from models.document_models import (
    DocumentListItem,
    DocumentListResponse,
    DocumentUploadResponse,
    generate_document_id,
)
from utils.azure_clients import get_blob_service_client, get_search_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


async def trigger_databricks_job(document_names: str, org_id: str, folder_id: str) -> None:
    """Fire-and-forget trigger for the Databricks ingestion job."""
    if not settings.DATABRICKS_HOST or not settings.DATABRICKS_TOKEN or not settings.DATABRICKS_JOB_ID:
        logger.debug("Databricks not configured, skipping job trigger")
        return
    url = f"{settings.DATABRICKS_HOST}/api/2.1/jobs/run-now"
    payload = {
        "job_id": settings.DATABRICKS_JOB_ID,
        "job_parameters": {
            "document_names": document_names,
            "organization_id": org_id,
            "folder_id": folder_id,
        },
    }
    logger.info("Triggering Databricks job %s at %s", settings.DATABRICKS_JOB_ID, url)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {settings.DATABRICKS_TOKEN}"},
                json=payload,
                timeout=10,
            )
        if resp.status_code == 200:
            logger.info("Databricks job triggered successfully: %s", resp.json())
        else:
            logger.error("Databricks trigger failed (%s): %s", resp.status_code, resp.text)
    except Exception:
        logger.exception("Failed to connect to Databricks")


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    organization_id: str = Form(...),
    folder_id: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Upload a document to Azure Blob Storage for ingestion."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )

    blob_service = get_blob_service_client()
    container_client = blob_service.get_container_client(settings.AZURE_STORAGE_CONTAINER_NAME)

    # Store blob under {organization_id}/{folder_id}/{filename}
    blob_path = f"{organization_id}/{folder_id}/{file.filename}"
    blob_client = container_client.get_blob_client(blob_path)
    blob_client.upload_blob(contents, overwrite=True)

    document_id = generate_document_id(blob_path)

    background_tasks.add_task(trigger_databricks_job, blob_path, organization_id, folder_id)

    return DocumentUploadResponse(
        document_id=document_id,
        document_name=file.filename,
        organization_id=organization_id,
        folder_id=folder_id,
        status="uploaded",
        message="Document uploaded successfully. Run the ingestion pipeline to process it.",
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    organization_id: str = Query(...),
    folder_id: Optional[str] = Query(default=None),
):
    """List documents in the storage container, filtered by organization and optionally by folder."""
    blob_service = get_blob_service_client()
    container_client = blob_service.get_container_client(settings.AZURE_STORAGE_CONTAINER_NAME)

    # Build prefix for listing: {org_id}/ or {org_id}/{folder_id}/
    prefix = f"{organization_id}/"
    if folder_id:
        prefix = f"{organization_id}/{folder_id}/"

    documents = []
    for blob in container_client.list_blobs(name_starts_with=prefix):
        ext = "." + blob.name.rsplit(".", 1)[-1].lower() if "." in blob.name else ""
        if ext not in ALLOWED_EXTENSIONS:
            continue

        # Parse org_id and folder_id from blob path: {org_id}/{folder_id}/{filename}
        parts = blob.name.split("/", 2)
        if len(parts) < 3:
            continue

        blob_org_id = parts[0]
        blob_folder_id = parts[1]
        filename = parts[2]

        documents.append(
            DocumentListItem(
                document_id=generate_document_id(blob.name),
                document_name=filename,
                organization_id=blob_org_id,
                folder_id=blob_folder_id,
                size_bytes=blob.size,
                uploaded_at=blob.last_modified.isoformat() if blob.last_modified else "",
            )
        )

    return DocumentListResponse(documents=documents)


@router.delete("/delete")
async def delete_document(
    document_id: str = Query(...),
    organization_id: str = Query(...),
    folder_id: str = Query(...),
    document_name: str = Query(...),
):
    """Delete a document from blob storage and the search index."""
    # Delete blob
    blob_service = get_blob_service_client()
    container_client = blob_service.get_container_client(settings.AZURE_STORAGE_CONTAINER_NAME)
    blob_path = f"{organization_id}/{folder_id}/{document_name}"
    try:
        container_client.delete_blob(blob_path)
    except Exception:
        logger.warning("Blob not found or already deleted: %s", blob_path)

    # Delete chunks from search index
    try:
        search_client = get_search_client()
        results = search_client.search(
            search_text="*",
            filter=f"document_id eq '{document_id}'",
            select=["id"],
        )
        docs_to_delete = [{"id": r["id"]} for r in results]
        if docs_to_delete:
            search_client.delete_documents(docs_to_delete)
            logger.info("Deleted %d search entries for document %s", len(docs_to_delete), document_id)
    except Exception:
        logger.warning("Failed to delete search entries for document %s", document_id)

    return {"ok": True}
