# Deployment Guide - SQL Curation QueryFlow

## Overview
This application is deployed to Vercel with both frontend (React/Vite) and backend (FastAPI) components.

## Environment Variables Required

Set these environment variables in your Vercel project settings:

### Required for Backend (Python)
```
GROQ_API_KEY=<your-groq-api-key>
HF_HUB_DISABLE_SYMLINKS_WARNING=1
ALLOW_ALL_ORIGINS=true
FRONTEND_URL=https://your-domain.vercel.app
SQLCURATION_CHROMA_DIR=/tmp/chroma_db
SQLCURATION_DB_PATH=/tmp/workspace.db
```

### Optional
- `XAI_API_KEY`: Alternative LLM provider (if GROQ_API_KEY is not available)

## Deployment Steps

1. **Push to GitHub**: Make sure all changes are committed and pushed

2. **Vercel Configuration**: 
   - The `vercel.json` file is already configured to:
     - Build the frontend (Vite)
     - Deploy the backend (Python/FastAPI)
     - Route `/api/*` requests to the backend
     - Route other requests to the frontend

3. **Set Environment Variables**:
   - Go to your Vercel project settings → Environment Variables
   - Add all required environment variables listed above
   - Redeploy the project

4. **Verify Deployment**:
   - Frontend: Check that the app loads at your Vercel domain
   - Backend: Test CSV upload to verify the backend is working

## Known Limitations

### Database Persistence
- SQLite database is stored in `/tmp/chroma_db` (ephemeral storage)
- Data persists only for the duration of a single request/session
- For production use, consider:
  - Using a persistent database (PostgreSQL, MongoDB, etc.)
  - Implementing session management with cookies/tokens
  - Using a file storage service (AWS S3, Azure Blob Storage)

### ChromaDB RAG Index
- The embeddings index is also stored in `/tmp` on Vercel
- Model download happens on first request (may cause timeouts)
- For better performance, consider:
  - Pre-caching the embedding model
  - Using a separate vector database service

## Troubleshooting

### "CSV Ingestion Failed: Failed to fetch"
1. **Check CORS**: Ensure `ALLOW_ALL_ORIGINS=true` is set in Vercel environment
2. **Check backend logs**: View in Vercel project → Logs → Runtime logs
3. **Verify frontend URL**: Ensure `FRONTEND_URL` matches your actual domain

### Backend errors
- Check Vercel function logs for detailed error messages
- Look for ChromaDB or embedding model download failures
- Verify all required Python dependencies are in `requirements.txt`

### Timeout issues
- First request may timeout due to model downloads
- Consider pre-warming the backend or using a dedicated backend service

## Next Steps

1. Deploy to Vercel and set environment variables
2. Test CSV upload functionality
3. Monitor logs for any errors
4. For production, implement persistent database solution
