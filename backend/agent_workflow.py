import os
import sqlite3
import json
import tempfile
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

# Relative import for same-directory modules
try:
    from .rag_index import retrieve_relevant_schema
except ImportError:
    from rag_index import retrieve_relevant_schema

# SQLite workspace database path
DB_PATH = os.getenv("SQLCURATION_DB_PATH") or os.path.join(tempfile.gettempdir(), "workspace.db")

# Define Agent Pipeline state structure
class AgentState(TypedDict):
    query: str
    dataset_type: str
    dataset_name: Optional[str]
    retrieved_schema: List[Dict[str, Any]]
    retrieved_chunks: List[str]
    sql: str
    results: Optional[List[Dict[str, Any]]]
    error: Optional[str]
    insights: Optional[Dict[str, Any]]
    steps: List[Dict[str, str]]
    retry_count: int
    max_retries: int
    api_key: str
    all_schemas: List[Dict[str, Any]]

# Clean SQL wrappers
def clean_sql(sql: str) -> str:
    sql = sql.strip()
    if sql.startswith("```"):
        sql = sql.replace("```sql", "").replace("```", "").strip()
    return sql.replace(";", "")

# SQLite Execution Guard
def execute_sqlite_query(sql: str) -> dict:
    conn = None
    try:
        sql_upper = sql.strip().upper()
        if not sql_upper.startswith("SELECT"):
            return {"success": False, "error": "Security Violation: Only SELECT statements are permitted."}
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        data = [dict(row) for row in rows]
        return {"success": True, "data": data, "row_count": len(data)}
    except sqlite3.Error as e:
        return {"success": False, "error": str(e)}
    finally:
        if conn:
            conn.close()

# Helper to dynamically load the LLM from environment variables
def get_llm(temperature: float = 0.0, json_mode: bool = False):
    api_key = os.getenv("GROQ_API_KEY", "").strip() or os.getenv("XAI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("No LLM API keys found in .env. Please define GROQ_API_KEY or XAI_API_KEY.")
    
    kwargs = {}
    if json_mode:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
        
    if api_key.startswith("gsk_"):
        return ChatOpenAI(
            model="llama-3.3-70b-versatile",
            openai_api_key=api_key,
            openai_api_base="https://api.groq.com/openai/v1",
            temperature=temperature,
            **kwargs
        )
    else:
        return ChatOpenAI(
            model="grok-2-1212",
            openai_api_key=api_key,
            openai_api_base="https://api.x.ai/v1",
            temperature=temperature,
            **kwargs
        )

# RAG Node: Schema Discovery
def discovery_node(state: AgentState) -> dict:
    steps = list(state.get("steps", []))
    
    if state.get("dataset_type") == "pdf":
        steps.append({"title": "Document RAG Retrieval", "status": "running", "detail": f"Searching chunks for PDF: {state['dataset_name']}..."})
        try:
            try:
                from .rag_index import retrieve_relevant_pdf_chunks
            except ImportError:
                from rag_index import retrieve_relevant_pdf_chunks
                
            chunks = retrieve_relevant_pdf_chunks(state["query"], state["dataset_name"] or "")
            steps[-1] = {
                "title": "Document RAG Retrieval",
                "status": "success",
                "detail": f"Vector search retrieved {len(chunks)} relevant document text chunks."
            }
            return {
                "retrieved_chunks": chunks,
                "steps": steps
            }
        except Exception as e:
            steps[-1] = {
                "title": "Document RAG Retrieval",
                "status": "error",
                "detail": f"Failed to retrieve chunks: {str(e)}"
            }
            return {
                "retrieved_chunks": [],
                "steps": steps,
                "error": f"Document RAG failed: {str(e)}"
            }
            
    steps.append({"title": "Schema RAG Retrieval", "status": "running", "detail": "Searching vectors catalog..."})
    retrieved = retrieve_relevant_schema(state["query"], state["all_schemas"])
    table_names = [s["table"] for s in retrieved]
    
    steps[-1] = {
        "title": "Schema RAG Retrieval", 
        "status": "success", 
        "detail": f"Vector search retrieved table context: {table_names}"
    }
    return {
        "retrieved_schema": retrieved,
        "steps": steps
    }

# SQL Generator Node
def generator_node(state: AgentState) -> dict:
    steps = list(state.get("steps", []))
    try_num = state.get("retry_count", 0) + 1
    steps.append({"title": f"SQL Generation (Try #{try_num})", "status": "running", "detail": "Consulting SQL Agent..."})
    
    error_context = None
    if state.get("error"):
        error_context = {"sql": state.get("sql", ""), "error": state.get("error", "")}
        
    try:
        schema_str = json.dumps(state["retrieved_schema"], indent=2)
        system_prompt = f"""You are a Principal Data Architect and AI Agent specializing in SQL generation.
Generate an ANSI-compliant SELECT query for the given SQLite database schema.

Database Schema:
{schema_str}

Rules:
1. ONLY return the raw SQL query. Do not wrap in markdown ```sql blocks. No explanations.
2. The query MUST be read-only (SELECT statements only). No updates, inserts, deletes, or alters.
3. Keep column names matching the schema exactly.

{f"PREVIOUS ERROR CONTEXT:\nThe query you generated: `{error_context['sql']}` failed with error: '{error_context['error']}'.\nPlease self-correct this SQL query to resolve this error." if error_context else ""}

Generate SQL query for user request: "{state['query']}" """

        llm = get_llm(temperature=0.0)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=state["query"])
        ]
        response = llm.invoke(messages)
        sql = clean_sql(response.content)
        
        steps[-1] = {
            "title": f"SQL Generation (Try #{try_num})", 
            "status": "success", 
            "detail": f"Formulated SQL: {sql}"
        }
        return {
            "sql": sql,
            "steps": steps,
            "retry_count": try_num,
            "error": None
        }
    except Exception as e:
        steps[-1] = {
            "title": f"SQL Generation (Try #{try_num})", 
            "status": "error", 
            "detail": f"SQL Generation failed: {str(e)}"
        }
        return {
            "error": f"SQL Generation failed: {str(e)}",
            "steps": steps,
            "retry_count": try_num
        }

# Query Execution & Validation Node
def execution_node(state: AgentState) -> dict:
    steps = list(state.get("steps", []))
    steps.append({"title": "Query Execution & Guard", "status": "running", "detail": "Validating SQL syntax on SQLite..."})
    
    res = execute_sqlite_query(state["sql"])
    
    if res["success"]:
        steps[-1] = {
            "title": "Query Execution & Guard", 
            "status": "success", 
            "detail": f"Execution resolved successfully. Fetched {res['row_count']} rows."
        }
        return {
            "results": res["data"],
            "error": None,
            "steps": steps
        }
    else:
        steps[-1] = {
            "title": "Query Execution & Guard", 
            "status": "error", 
            "detail": f"SQLite Exception: {res['error']}"
        }
        return {
            "error": res["error"],
            "steps": steps
        }

# Insights Generator Node
def insights_node(state: AgentState) -> dict:
    steps = list(state.get("steps", []))
    steps.append({"title": "Insight Generation", "status": "running", "detail": "Running analytical insights model..."})
    
    if state.get("dataset_type") == "pdf":
        if not state.get("retrieved_chunks"):
            steps[-1] = {
                "title": "Insight Generation",
                "status": "error",
                "detail": "No relevant text chunks retrieved from PDF."
            }
            return {
                "insights": {
                    "summary": "Could not find any relevant information in the document to answer your query.",
                    "chartType": "table",
                    "chartConfig": {"xAxisKey": "", "dataKeys": [], "title": "No Context"}
                },
                "steps": steps
            }
        try:
            chunks_str = "\n\n".join(state["retrieved_chunks"])
            system_prompt = f"""You are a Principal Data Analyst and Business Intelligence Agent.
Analyze the following document excerpts and write a concise, precise direct answer explaining the key findings relative to the user question.

Document Excerpts:
{chunks_str}

User Question: "{state['query']}"

Requirements:
1. The "summary" MUST be extremely precise, concise, and direct (maximum 3-4 sentences).
2. DO NOT include any markdown headers (such as '###' or '####'), titles, or list bullet points.
3. Just provide a direct, simple response explaining the findings based on the text.
4. Since this is a document search, suggest chartType: "table" and return empty chartConfig details.

Format your response as a JSON object with this exact keys structure:
{{
  "summary": "Precise text summary (no headers like ###, max 4 sentences)",
  "chartType": "table",
  "chartConfig": {{
    "xAxisKey": "",
    "dataKeys": [],
    "title": "Document Reference"
  }}
}}"""

            llm = get_llm(temperature=0.2, json_mode=True)
            messages = [SystemMessage(content=system_prompt)]
            
            response = llm.invoke(messages)
            insights = json.loads(response.content.strip())
            
            steps[-1] = {
                "title": "Insight Generation", 
                "status": "success", 
                "detail": "Document analysis report compiled."
            }
            return {
                "insights": insights,
                "steps": steps
            }
        except Exception as e:
            steps[-1] = {
                "title": "Insight Generation", 
                "status": "error", 
                "detail": f"Document insights compilation failed: {str(e)}"
            }
            return {
                "insights": {
                    "summary": f"Could not compile insights from document. Raw error: {str(e)}",
                    "chartType": "table",
                    "chartConfig": {
                        "xAxisKey": "",
                        "dataKeys": [],
                        "title": "Document Analysis"
                    }
                },
                "steps": steps
            }

    if not state.get("results"):
        steps[-1] = {
            "title": "Insight Generation", 
            "status": "error", 
            "detail": "No results available to generate insights."
        }
        return {
            "insights": {
                "summary": "No data returned from query execution.",
                "chartType": "table",
                "chartConfig": {"xAxisKey": "", "dataKeys": [], "title": "No Data"}
            },
            "steps": steps
        }

    try:
        data_str = json.dumps(state["results"][:30], indent=2)
        system_prompt = f"""You are a Principal Data Analyst.
Analyze the following SQL query results and write a very concise, precise direct answer explaining the key findings to business users.

User Question: "{state['query']}"
Executed SQL: `{state['sql']}`
Query Results (JSON):
{data_str}

Requirements:
1. The "summary" MUST be extremely precise, concise, and direct (maximum 2-3 sentences).
2. DO NOT include any markdown headers (such as '###' or '####'), titles, or list bullet points.
3. Just provide a direct, simple response explaining what the numbers show relative to the user question.
4. Determine the best chart configuration to show this data. Suggest: 'line', 'bar', 'pie', or 'table'.
5. Provide the exact structure for charting.

Format your response as a JSON object with this exact keys structure:
{{
  "summary": "Precise text summary (no headers like ###, max 3 sentences)",
  "chartType": "bar" | "line" | "pie" | "table",
  "chartConfig": {{
    "xAxisKey": "name_of_column_for_x_axis",
    "dataKeys": ["name_of_column_for_y_values"],
    "title": "Title of the chart"
  }}
}}"""

        llm = get_llm(temperature=0.2, json_mode=True)
        messages = [SystemMessage(content=system_prompt)]
        
        response = llm.invoke(messages)
        insights = json.loads(response.content.strip())
        
        steps[-1] = {
            "title": "Insight Generation", 
            "status": "success", 
            "detail": "Business report compiled."
        }
        return {
            "insights": insights,
            "steps": steps
        }
    except Exception as e:
        steps[-1] = {
            "title": "Insight Generation", 
            "status": "error", 
            "detail": f"Insights compilation failed: {str(e)}"
        }
        
        # Safely determine fallbacks for chart structure
        first_row = state["results"][0] if state["results"] else {}
        keys = list(first_row.keys())
        x_key = keys[0] if keys else ""
        y_keys = keys[1:] if len(keys) > 1 else []
        
        return {
            "insights": {
                "summary": f"Query executed successfully, but insights could not be compiled. Raw error: {str(e)}",
                "chartType": "table",
                "chartConfig": {
                    "xAxisKey": x_key,
                    "dataKeys": y_keys,
                    "title": "Query Results"
                }
            },
            "steps": steps
        }

# Router Condition for Healing Loop
def route_healing(state: AgentState) -> str:
    if state.get("error"):
        if state.get("retry_count", 0) < state.get("max_retries", 3):
            # Route back to SQL Generation Node, incrementing retry
            return "healing"
        else:
            return "failed"
    else:
        return "success"

# Compile LangGraph Workflow
def create_agent_graph() -> StateGraph:
    workflow = StateGraph(AgentState)
    
    # Register Nodes
    workflow.add_node("discovery", discovery_node)
    workflow.add_node("generator", generator_node)
    workflow.add_node("execution", execution_node)
    workflow.add_node("insights", insights_node)
    
    # Set entry point
    workflow.set_entry_point("discovery")
    
    # Define route conditional after discovery
    def route_discovery(state: AgentState) -> str:
        if state.get("dataset_type") == "pdf":
            return "pdf_insights"
        return "sql_generator"
        
    # Add transitions
    workflow.add_conditional_edges(
        "discovery",
        route_discovery,
        {
            "pdf_insights": "insights",
            "sql_generator": "generator"
        }
    )
    workflow.add_edge("generator", "execution")
    
    # Add conditional router after execution
    workflow.add_conditional_edges(
        "execution",
        route_healing,
        {
            "healing": "generator",
            "success": "insights",
            "failed": END
        }
    )
    
    # Add end edge
    workflow.add_edge("insights", END)
    
    return workflow.compile()

# Global compiled agent graph instance
agent_graph = create_agent_graph()

def run_agent_pipeline(query: str, all_schemas: list, dataset_type: str = "csv", dataset_name: str = None) -> dict:
    """
    Convenience function to execute the LangGraph Agent pipeline.
    """
    initial_state = {
        "query": query,
        "dataset_type": dataset_type,
        "dataset_name": dataset_name,
        "retrieved_schema": [],
        "retrieved_chunks": [],
        "sql": "",
        "results": None,
        "error": None,
        "insights": None,
        "steps": [],
        "retry_count": 0,
        "max_retries": 3,
        "api_key": "",
        "all_schemas": all_schemas
    }
    
    # Run graph
    final_state = agent_graph.invoke(initial_state)
    
    # In case of infinite loops or crashes
    if final_state.get("error"):
        steps = list(final_state.get("steps", []))
        steps.append({"title": "Pipeline Terminated", "status": "error", "detail": final_state["error"]})
        final_state["steps"] = steps
        
    return {
        "sql": final_state.get("sql", ""),
        "results": final_state.get("results", []),
        "insights": final_state.get("insights", {}),
        "steps": final_state.get("steps", []),
        "error": final_state.get("error", None)
    }
