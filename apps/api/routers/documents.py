from __future__ import annotations

from fastapi import APIRouter, Form, HTTPException, Query, UploadFile

from config.settings import settings
from models.document_models import (
    DocumentListItem,
    DocumentListResponse,
    DocumentUploadResponse,
    generate_document_id,
)
from utils.azure_clients import get_blob_service_client

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    organization_id: str = Form(...),
    folder_id: str = Form(...),
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
    folder_id: str | None = Query(default=None),
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
