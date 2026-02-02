# Website Analysis API

Production-ready API for analyzing websites using Google Gemini AI. The API fetches website content via Firecrawl (with Jina Reader fallback), processes it through Gemini for comprehensive analysis, and stores results in PostgreSQL.

## Features

- 🚀 **High Performance**: Built with Bun runtime for maximum speed
- 🔒 **Security**: SSRF protection, input validation, secure error handling
- 📊 **Comprehensive Analysis**: SEO, content quality, technical observations, and actionable recommendations
- 💾 **Persistent Storage**: PostgreSQL with Prisma ORM
- 🔄 **Async Processing**: Job queue system for background analysis
- 📝 **Structured Logging**: Pino logger with request ID tracking
- 🎯 **Type Safety**: Full TypeScript with strict mode

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia (latest)
- **Language**: TypeScript (strict mode)
- **Database**: Neon PostgreSQL with Prisma ORM
- **AI**: Google Gemini API (@google/generative-ai)
- **Web Scraping**: Firecrawl API (primary) with Jina Reader fallback
- **Validation**: Zod
- **Logging**: Pino

## Prerequisites

- [Bun](https://bun.sh/) installed (latest version)
- PostgreSQL database (Neon recommended)
- Google Gemini API key
- Firecrawl API key (optional - falls back to Jina Reader)

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g., Neon)
- `GEMINI_API_KEY`: Google Gemini API key
- `FIRECRAWL_API_KEY`: (Optional) Firecrawl API key
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### 3. Set Up Database

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push
```

### 4. Start Development Server

```bash
bun run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### POST /api/analyze

Creates a new analysis job (async processing). Returns job ID immediately.

**Request:**
```json
{
  "url": "https://example.com",
  "analysisType": "comprehensive"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "clx1234...",
    "status": "PENDING",
    "statusUrl": "/api/analyze/clx1234..."
  }
}
```

**Analysis Types:**
- `comprehensive` (default): Full analysis of all aspects
- `seo`: Focus on SEO strengths, weaknesses, and recommendations
- `content`: Focus on content quality, tone, and messaging
- `technical`: Focus on technical observations and recommendations

### GET /api/analyze/:jobId

Get analysis job status and results.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clx1234...",
    "url": "https://example.com",
    "status": "COMPLETED",
    "analysis": {
      "summary": "...",
      "businessType": "...",
      "targetAudience": "...",
      "keyServices": [...],
      "uniqueSellingPoints": [...],
      "toneAndVoice": "...",
      "seoAnalysis": {
        "strengths": [...],
        "weaknesses": [...],
        "recommendations": [...]
      },
      "contentQuality": {
        "score": 8,
        "feedback": "..."
      },
      "technicalObservations": [...],
      "competitorInsights": [...],
      "actionableRecommendations": [...]
    },
    "metadata": {
      "tokensUsed": 1523,
      "processingMs": 4521,
      "createdAt": "2026-01-27T...",
      "completedAt": "2026-01-27T..."
    }
  }
}
```

**Status Values:**
- `PENDING`: Job is queued
- `SCRAPING`: Fetching website content
- `ANALYZING`: Processing with Gemini
- `COMPLETED`: Analysis complete
- `FAILED`: Analysis failed (check `errorMessage`)

### GET /api/analyze

List analyses with filtering.

**Query Parameters:**
- `url` (optional): Filter by URL
- `status` (optional): Filter by status
- `limit` (optional): Results per page (default: 20, max: 100)
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "nextCursor": "clx5678..." // null if no more pages
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-27T...",
    "database": "connected",
    "version": "1.0.0"
  }
}
```

## Usage Examples

### Analyze a Website

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "analysisType": "comprehensive"
  }'
```

### Check Job Status

```bash
curl http://localhost:3000/api/analyze/{jobId}
```

### List Recent Analyses

```bash
curl "http://localhost:3000/api/analyze?limit=10&status=COMPLETED"
```

## Project Structure

```
server/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── routes/
│   │   ├── analyze.ts         # Analysis endpoints
│   │   └── health.ts          # Health check
│   ├── services/
│   │   ├── scraper.service.ts # Website scraping
│   │   ├── gemini.service.ts  # Gemini integration
│   │   └── analysis.service.ts # Analysis orchestrator
│   ├── jobs/
│   │   └── analysis.queue.ts  # Job queue processor
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── logger.ts          # Pino logger
│   │   └── errors.ts          # Custom errors
│   ├── middleware/
│   │   ├── request-id.ts      # Request ID tracking
│   │   └── error-handler.ts   # Error handling
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── utils/
│   │   ├── validation.ts      # Zod schemas
│   │   └── security.ts        # SSRF protection
│   ├── config/
│   │   └── env.ts             # Environment config
│   └── index.ts               # Main server
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Security Features

- **SSRF Protection**: Blocks private IPs, localhost, and metadata endpoints
- **Input Validation**: Zod schemas for all inputs
- **Error Handling**: Structured error responses without leaking internals
- **Request ID Tracking**: All requests have unique IDs for tracing

## Caching

The API automatically caches analysis results for 7 days. If a URL was analyzed within the last 7 days, the cached result is returned instead of creating a new job.

## Rate Limiting

Currently, jobs are processed sequentially to respect rate limits. For production at scale, consider:
- Implementing Redis-based rate limiting
- Upgrading to BullMQ for distributed job processing
- Adding per-user rate limits

## Development

### Type Checking

```bash
bun run typecheck
```

### Database Studio

```bash
bun run db:studio
```

Opens Prisma Studio at `http://localhost:5555` for database management.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure `CORS_ORIGIN` with allowed origins
3. Use a production PostgreSQL database
4. Set up proper logging aggregation
5. Consider upgrading job queue to BullMQ with Redis
6. Implement rate limiting with Redis
7. Set up monitoring and alerting

## Error Handling

All errors return structured responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Only in development
  }
}
```

## License

MIT
