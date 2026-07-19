import os
import sqlite3
import re
import logging
import tempfile
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Database path
DB_PATH = os.getenv("SQLCURATION_DB_PATH") or os.path.join(tempfile.gettempdir(), "workspace.db")

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)

def sanitize_name(name: str) -> str:
    """Sanitize identifiers for SQLite"""
    cleaned = name.lower()
    cleaned = re.sub(r'[^a-z0-9_]', '_', cleaned)
    cleaned = re.sub(r'^_+|_+$', '', cleaned)
    if cleaned and cleaned[0].isdigit():
        cleaned = "t_" + cleaned
    return cleaned or "uploaded_table"

def get_db_connection():
    """Get a database connection"""
    return sqlite3.connect(DB_PATH)

def get_schemas_internal():
    """
    Retrieves the SQLite table schemas dynamically.
    """
    if not os.path.exists(DB_PATH):
        return []
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
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
