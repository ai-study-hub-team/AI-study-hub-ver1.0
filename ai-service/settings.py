import os
from dotenv import load_dotenv

load_dotenv()

# ─── Vector Store Selection ───────────────────────────────────────────────────
# Set to "pgvector" to use PostgreSQL pgvector, or "pinecone" to use Pinecone.
VECTOR_STORE = os.getenv("VECTOR_STORE", "pgvector")

# ─── Pinecone (optional when VECTOR_STORE=pgvector) ──────────────────────────
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "ai-study-hub")

# ─── pgvector PostgreSQL connection ──────────────────────────────────────────
PGVECTOR_HOST = os.getenv("PGVECTOR_HOST", "localhost")
PGVECTOR_PORT = os.getenv("PGVECTOR_PORT", "5433")
PGVECTOR_DATABASE = os.getenv("PGVECTOR_DATABASE", "aistudyhub_pgvector_test")
PGVECTOR_USER = os.getenv("PGVECTOR_USER", "postgres")
PGVECTOR_PASSWORD = os.getenv("PGVECTOR_PASSWORD", "123456")

# ─── Gemini ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Model used for BOTH answer generation (/generate-answer, /chat, /summary, /quiz)
# AND the chat planner (/analyze-chat-query).
# TODO: To save token quota, consider introducing a separate lighter model for the
#       planner. Example: add GEMINI_PLANNER_MODEL = os.getenv("GEMINI_PLANNER_MODEL", "gemini-2.0-flash-lite")
#       and use it in the /analyze-chat-query endpoint instead of GEMINI_MODEL.
#       The planner only returns a small JSON object so a cheaper model is sufficient.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # gemini-2.5-flash | gemini-2.0-flash-lite

# ─── Spring Boot ──────────────────────────────────────────────────────────────
SPRING_BOOT_BASE_URL = os.getenv("SPRING_BOOT_BASE_URL", "http://localhost:8080")

# ─── Embedding Model ─────────────────────────────────────────────────────────
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")


