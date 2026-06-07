from app.core.config import Settings
from app.services.rag.schemas import RagDocument, RagSearchResult


class PineconeClientPlaceholder:
    """Pinecone integration seam.

    This class intentionally avoids importing or calling Pinecone. It documents
    the shape of the future adapter while keeping the MVP runnable without
    vector infrastructure.
    """

    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.pinecone_api_key
        self.index_name = settings.pinecone_index_name
        self.namespace = settings.pinecone_namespace

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.index_name)

    def upsert_documents(self, documents: list[RagDocument]) -> None:
        return None

    def search(
        self,
        user_id: int,
        query: str,
        document_types: list[str] | None = None,
        limit: int = 5,
    ) -> list[RagSearchResult]:
        return []
