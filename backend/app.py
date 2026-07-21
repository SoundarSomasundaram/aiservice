import os
import csv
import re
import sqlite3
import logging
from io import BytesIO
import pypdf
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, UploadFile, File, Header, HTTPException

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from rag_index import index_table_schema, delete_table_schema, index_pdf_document, delete_pdf_document
from agent_workflow import run_agent_pipeline, DB_PATH

app = FastAPI(title="QueryFlow API Server")

# Allow requests from Vite dev server and deployed frontend
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)
    # Handle optional trailing slashes
    if frontend_url.endswith("/"):
        origins.append(frontend_url[:-1])
    else:
        origins.append(frontend_url + "/")

allow_all_origins = os.getenv("ALLOW_ALL_ORIGINS", "false").lower() in ("1", "true", "yes")
if allow_all_origins or not frontend_url:
    origins = ["*"]

logger.info(f"CORS allowed origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False if origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
logger.info(f"Database path: {DB_PATH}")

# Helper to sanitize identifiers for SQLite
def sanitize_name(name: str) -> str:
    cleaned = name.lower()
    cleaned = re.sub(r'[^a-z0-9_]', '_', cleaned)
    cleaned = re.sub(r'^_+|_+$', '', cleaned)
    if cleaned and cleaned[0].isdigit():
        cleaned = "t_" + cleaned
    return cleaned or "uploaded_table"

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring and debugging"""
    return {
        "status": "ok",
        "db_path": DB_PATH,
        "db_exists": os.path.exists(DB_PATH),
        "cors_origins": origins
    }

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        decoded = content.decode('utf-8-sig', errors='replace').splitlines()
        
        reader = csv.reader(decoded)
        rows = list(reader)
        
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="Uploaded file must have a header row and data rows in CSV format.")
            
        raw_headers = rows[0]
        data_rows = rows[1:]
        
        # Sanitize and de-duplicate headers
        sanitized_headers = []
        seen = {}
        for h in raw_headers:
            clean_h = sanitize_name(h)
            if clean_h in seen:
                seen[clean_h] += 1
                sanitized_headers.append(f"{clean_h}_{seen[clean_h]}")
            else:
                seen[clean_h] = 0
                sanitized_headers.append(clean_h)
                
        # Determine column types
        col_types = []
        for col_idx in range(len(sanitized_headers)):
            is_numeric = True
            has_data = False
            for row in data_rows:
                if col_idx < len(row):
                    val = row[col_idx].strip()
                    if val != "":
                        has_data = True
                        try:
                            float(val)
                        except ValueError:
                            is_numeric = False
                            break
            col_types.append("REAL" if (is_numeric and has_data) else "TEXT")

        # Sanitize table name
        base_name = file.filename.rsplit('.', 1)[0]
        table_name = sanitize_name(base_name)
        
        # SQLite execution
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
        
        columns_def = ", ".join([f"{h} {t}" for h, t in zip(sanitized_headers, col_types)])
        cursor.execute(f"CREATE TABLE {table_name} ({columns_def})")
        
        placeholders = ", ".join(["?" for _ in sanitized_headers])
        insert_sql = f"INSERT INTO {table_name} VALUES ({placeholders})"
        
        for row in data_rows:
            row_data = []
            for idx in range(len(sanitized_headers)):
                val = row[idx].strip() if idx < len(row) else ""
                if col_types[idx] == "REAL":
                    try:
                        row_data.append(float(val) if val != "" else None)
                    except ValueError:
                        row_data.append(None)
                else:
                    row_data.append(val if val != "" else None)
            cursor.execute(insert_sql, row_data)
            
        conn.commit()
        conn.close()
        
        # Index in ChromaDB
        columns_metadata = []
        for h, t in zip(sanitized_headers, col_types):
            columns_metadata.append({
                "name": h,
                "type": "NUMBER" if t == "REAL" else "VARCHAR",
                "description": f"Field representing {h}"
            })
            
        index_table_schema(table_name, columns_metadata)
        
        return {
            "success": True,
            "table": table_name,
            "fileName": file.filename,
            "rowCount": len(data_rows),
            "columns": sanitized_headers
        }
    except Exception as e:
        logger.error(f"CSV upload failed: {str(e)}", exc_info=True)
        error_detail = f"CSV upload error: {str(e)}"
        raise HTTPException(status_code=500, detail=error_detail)

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        reader = pypdf.PdfReader(BytesIO(content))
        
        # Extract text from all pages
        text_list = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_list.append(t)
                
        full_text = "\n".join(text_list)
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Uploaded PDF file does not contain readable text.")
            
        # Sanitize PDF name
        base_name = file.filename.rsplit('.', 1)[0]
        pdf_name = sanitize_name(base_name)
        
        # Store in SQLite metadata table `uploaded_pdfs`
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS uploaded_pdfs (name TEXT PRIMARY KEY, filename TEXT, content TEXT)")
        cursor.execute("INSERT OR REPLACE INTO uploaded_pdfs VALUES (?, ?, ?)", (pdf_name, file.filename, full_text))
        conn.commit()
        conn.close()
        
        # Index in ChromaDB
        index_pdf_document(pdf_name, full_text)
        
        return {
            "success": True,
            "type": "pdf",
            "name": pdf_name,
            "fileName": file.filename,
            "charCount": len(full_text),
            "pageCount": len(reader.pages)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF upload error: {str(e)}")

class QueryRequest(BaseModel):
    query: str
    dataset_type: Optional[str] = "csv"
    dataset_name: Optional[str] = None

@app.post("/api/query")
async def run_query(req: QueryRequest):
    try:
        all_schemas = get_schemas_internal()
        
        # Run LangGraph pipeline
        result = run_agent_pipeline(
            query=req.query,
            all_schemas=all_schemas,
            dataset_type=req.dataset_type,
            dataset_name=req.dataset_name
        )
        
        return {
            "success": True,
            "sql": result["sql"],
            "results": result["results"],
            "insights": result["insights"],
            "steps": result["steps"],
            "error": result["error"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_schemas_internal():
    """
    Retrieves the SQLite table schemas dynamically.
    """
    if not os.path.exists(DB_PATH):
        return []
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'uploaded_pdfs'")
    tables = [row[0] for row in cursor.fetchall()]
    
    schemas = []
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns_info = cursor.fetchall()
        
        columns = []
        for col in columns_info:
            col_name = col[1]
            col_type = col[2]
            columns.append({
                "name": col_name,
                "type": "NUMBER" if col_type in ["REAL", "INTEGER", "NUMBER"] else "VARCHAR",
                "description": f"Field representing {col_name}"
            })
            
        schemas.append({
            "table": table,
            "description": f"Dataset containing columns: {', '.join([c['name'] for c in columns])}",
            "columns": columns
        })
        
    conn.close()
    return schemas

@app.get("/api/tables")
async def get_tables():
    try:
        schemas = get_schemas_internal()
        tables_list = []
        for s in schemas:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {s['table']}")
            row_count = cursor.fetchone()[0]
            conn.close()
            
            tables_list.append({
                "name": s["table"],
                "fileName": f"{s['table']}.csv",
                "rowCount": row_count,
                "columns": [c["name"] for c in s["columns"]],
                "schema": s
            })
        return {"success": True, "tables": tables_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tables/{name}/rows")
async def get_table_rows(name: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {name}")
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        conn.close()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tables/{name}")
async def delete_table(name: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if it is a standard table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
        is_table = cursor.fetchone()
        
        if is_table:
            cursor.execute(f"DROP TABLE IF EXISTS {name}")
            conn.commit()
            conn.close()
            # Remove from schema vector store
            delete_table_schema(name)
        else:
            # Check if it is stored in uploaded_pdfs
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='uploaded_pdfs'")
            has_pdfs_table = cursor.fetchone()
            if has_pdfs_table:
                cursor.execute("DELETE FROM uploaded_pdfs WHERE name=?", (name,))
                conn.commit()
            conn.close()
            # Remove from PDF chunks vector store
            delete_pdf_document(name)
            
        return {"success": True, "message": f"Dataset '{name}' deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
