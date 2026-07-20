import os
from pathlib import Path
from typing import List

# Prevent sentence-transformers from hitting HuggingFace Hub on every load
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

CHROMA_PATH = str(Path(__file__).parent / "chroma_db")
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"

_client = None
_collection = None
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMBED_MODEL_NAME)
    return _embedder


def _get_collection():
    global _client, _collection
    if _collection is None:
        import chromadb
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection(
            "amelia_docs",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def _chunk_text(text: str, chunk_size: int = 400, overlap: int = 40) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def _read_file(file_path: str) -> str:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(str(path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            try:
                import PyPDF2
                with open(str(path), "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    return "\n".join(page.extract_text() or "" for page in reader.pages)
            except ImportError:
                raise RuntimeError("Install pypdf: pip install pypdf")

    elif ext in (".docx", ".doc"):
        try:
            import docx
            doc = docx.Document(str(path))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            raise RuntimeError("Install python-docx: pip install python-docx")

    else:
        return path.read_text(encoding="utf-8", errors="ignore")


def add_document(file_path: str, doc_name: str) -> int:
    """Ingest a file into the knowledge base. Returns number of chunks stored."""
    text = _read_file(file_path)
    chunks = _chunk_text(text)
    if not chunks:
        return 0

    embedder = _get_embedder()
    collection = _get_collection()

    embeddings = embedder.encode(chunks, show_progress_bar=False).tolist()
    ids = [f"{doc_name}__chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": doc_name, "chunk": i} for i in range(len(chunks))]

    # Replace existing chunks for this doc
    try:
        existing = collection.get(where={"source": doc_name})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadatas)
    return len(chunks)


def query_knowledge(query: str, n_results: int = 3) -> List[str]:
    """Return the top relevant text chunks for a query. Empty list if KB is empty."""
    try:
        collection = _get_collection()
        total = collection.count()
        if total == 0:
            return []

        embedder = _get_embedder()
        query_embedding = embedder.encode([query]).tolist()

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(n_results, total),
        )
        return results["documents"][0] if results["documents"] else []
    except Exception:
        return []


def list_documents() -> List[dict]:
    """List all documents and their chunk counts."""
    try:
        collection = _get_collection()
        all_items = collection.get()
        seen: dict = {}
        for meta in all_items.get("metadatas") or []:
            src = meta.get("source", "unknown")
            seen[src] = seen.get(src, 0) + 1
        return [{"name": name, "chunks": count} for name, count in seen.items()]
    except Exception:
        return []


def delete_document(doc_name: str) -> bool:
    """Remove all chunks belonging to doc_name from the knowledge base."""
    try:
        collection = _get_collection()
        existing = collection.get(where={"source": doc_name})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
            return True
        return False
    except Exception:
        return False
