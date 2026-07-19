import os
import tempfile
import chromadb
from chromadb.utils import embedding_functions
import logging

logger = logging.getLogger(__name__)

# Storage directory inside backend runtime; /tmp is writable on serverless platforms like Vercel.
CHROMA_DIR = os.getenv("SQLCURATION_CHROMA_DIR") or os.path.join(tempfile.gettempdir(), "chroma_db")

# Initialize Persistent client with error handling
client = None
hf_ef = None
collection = None

try:
    # Create CHROMA_DIR if it doesn't exist
    os.makedirs(CHROMA_DIR, exist_ok=True)
    
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Use HuggingFace local SentenceTransformer model (all-MiniLM-L6-v2) for embeddings
    hf_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    
    # Get or create collection for schema embeddings
    collection = client.get_or_create_collection(
        name="schema_rag",
        embedding_function=hf_ef
    )
    logger.info("ChromaDB and embeddings initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB: {str(e)}")
    logger.warning("Continuing without ChromaDB functionality")

def index_table_schema(table_name: str, columns: list):
    """
    Indexes columns and descriptions of a table in ChromaDB.
    columns: list of dicts, e.g. [{"name": "revenue", "type": "NUMBER", "description": "sales revenue"}]
    """
    if collection is None:
        logger.warning(f"ChromaDB not available, skipping indexing for table {table_name}")
        return
    
    try:
        documents = []
        metadatas = []
        ids = []
        
        for col in columns:
            col_name = col["name"]
            col_type = col["type"]
            col_desc = col.get("description", "") or f"field {col_name}"
            
            doc = f"Table: {table_name}, Column: {col_name}, Type: {col_type}, Description: {col_desc}"
            meta = {
                "table": table_name,
                "column": col_name,
                "type": col_type
            }
            doc_id = f"{table_name}_{col_name}"
            
            documents.append(doc)
            metadatas.append(meta)
            ids.append(doc_id)
            
        if ids:
            # Delete old indexed entries for this table
            delete_table_schema(table_name)
            # Add new records
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
    except Exception as e:
        logger.error(f"Failed to index table schema for {table_name}: {str(e)}")

def delete_table_schema(table_name: str):
    """
    Deletes all indexed columns for a table from ChromaDB.
    """
    if collection is None:
        logger.warning(f"ChromaDB not available, skipping deletion for table {table_name}")
        return
    
    try:
        results = collection.get(where={"table": table_name})
        if results and results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception as e:
        logger.error(f"Error deleting schema records from Chroma: {e}")

def retrieve_relevant_schema(query: str, all_schemas: list, limit: int = 6) -> list:
    """
    Queries ChromaDB matching the user prompt, retrieves relevant table names,
    and returns matching schemas from all_schemas.
    """
    if not all_schemas:
        return []
    
    if collection is None:
        logger.warning("ChromaDB not available, returning all schemas")
        return all_schemas
        
    try:
        count = collection.count()
        if count == 0:
            return all_schemas
            
        results = collection.query(
            query_texts=[query],
            n_results=min(limit, count)
        )
        
        if not results or not results["metadatas"] or not results["metadatas"][0]:
            return [all_schemas[0]]
            
        # Extract unique table names
        relevant_tables = set()
        for meta in results["metadatas"][0]:
            relevant_tables.add(meta["table"])
            
        # Match against database schemas
        matched_schemas = [s for s in all_schemas if s["table"] in relevant_tables]
        
        if not matched_schemas:
            return [all_schemas[0]]
            
        return matched_schemas
    except Exception as e:
        logger.error(f"RAG search error, falling back: {e}")
        return [all_schemas[0]] if all_schemas else []
