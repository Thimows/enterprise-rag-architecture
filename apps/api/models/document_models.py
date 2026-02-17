import uuid

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: str
    document_name: str
    organization_id: str
    folder_id: str
    status: str
    message: str


class DocumentListItem(BaseModel):
    document_id: str
    document_name: str
    organization_id: str
    folder_id: str
    size_bytes: int
    uploaded_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItem]


def generate_document_id(blob_name: str) -> str:
    """Generate a deterministic document ID from the blob name."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, blob_name))
