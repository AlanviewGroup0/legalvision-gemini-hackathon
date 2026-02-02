# Legal Vision API - Bruno Collection

This Bruno collection contains all the API endpoints for the Legal Vision server.

## Setup

1. Open Bruno
2. Click "Open Collection" or "Import Collection"
3. Select the `bruno` folder in this directory
4. Select the environment (Local or Production)

## Environments

- **Local**: `http://localhost:3000` (default)
- **Production**: Update with your production URL

## Endpoints

### Health Check
- **GET** `/health` - Check server and database health

### Analysis Jobs

#### Create Analysis Job
- **POST** `/api/analyze`
  - Creates a new analysis job
  - Returns job ID and status URL
  - Checks for cached results (24-hour cache)
  - Analysis types: `comprehensive`, `seo`, `content`, `technical`

#### Get Analysis Job
- **GET** `/api/analyze/:jobId`
  - Get status and results of an analysis job
  - Poll this endpoint until status is `COMPLETED` or `FAILED`

#### List Analyses
- **GET** `/api/analyze`
  - List all analysis jobs with optional filtering
  - Supports pagination with cursor
  - Filter by status, URL, or both

## Usage Workflow

1. **Create Analysis Job**: POST to `/api/analyze` with a URL
2. **Get Job ID**: From the response, extract `jobId`
3. **Poll for Results**: GET `/api/analyze/:jobId` every 2-5 seconds
4. **Check Status**: Continue polling until status is `COMPLETED` or `FAILED`
5. **View Results**: When `COMPLETED`, the `analysis` field contains the results

## Example Request/Response

### Create Analysis Job

**Request:**
```json
{
  "url": "https://example.com/terms",
  "analysisType": "comprehensive"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "clx1234567890",
    "status": "PENDING",
    "statusUrl": "/api/analyze/clx1234567890"
  }
}
```

### Get Analysis Job

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "url": "https://example.com/terms",
    "status": "COMPLETED",
    "analysis": {
      // Analysis results here
    },
    "metadata": {
      "tokensUsed": 1500,
      "processingMs": 3500,
      "createdAt": "2026-01-27T10:00:00.000Z",
      "completedAt": "2026-01-27T10:00:05.000Z"
    }
  }
}
```

## Caching

The server caches analysis results for 24 hours based on:
- **Normalized URL**: URLs are normalized (removes trailing slashes, sorts query params, etc.)
- **Timestamp**: Results are cached if completed within the last 24 hours

If a cached result exists, the server returns the existing job ID instead of creating a new job.

## Rate Limiting

- 60 requests per minute per IP address
- Returns 429 status if exceeded

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```
