import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

_handler = logging.StreamHandler()
for _name in ("routers", "services"):
    _log = logging.getLogger(_name)
    _log.setLevel(logging.INFO)
    _log.addHandler(_handler)

from config.settings import settings
from routers import health, chat, documents

app = FastAPI(
    title="Enterprise RAG API",
    description="Production-grade Retrieval-Augmented Generation API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
