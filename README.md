# Legal Vision

**See what you're actually agreeing to at the moment of consent.**

Legal Vision is a Chrome extension that helps users understand terms and conditions in plain language. When you're about to sign up or agree to terms, it analyzes the linked legal documents with AI and surfaces risks, summaries, and a consent summary box you can show on the page.

- **Extension** – Detects consent moments, analyzes terms, and injects a consent summary on the page
- **API** – Elysia server with Gemini AI, Prisma + Neon, and Trigger.dev for background jobs
- **Web** – Landing page and install instructions

## Links

- **Repository**: [github.com/AlanviewGroup0/legalvision-gemini-hackathon](https://github.com/AlanviewGroup0/legalvision-gemini-hackathon)
- **Releases / Download**: [Releases (V0.1)](https://github.com/AlanviewGroup0/legalvision-gemini-hackathon/releases/tag/V0.1)
- **Landing**: [legalvision-gemini-hackathon.vercel.app](https://legalvision-gemini-hackathon.vercel.app)

## Project structure

```
├── ext/          # Chrome extension (manifest v3)
├── server/       # API (Elysia, Gemini, Prisma, Trigger.dev)
├── web/          # Landing page (Vite + React)
└── bruno/        # API request collections
```

## Prerequisites

- **Extension**: Chrome (or Chromium-based browser)
- **Server**: [Bun](https://bun.sh/), PostgreSQL (e.g. [Neon](https://neon.tech)), [Google Gemini API](https://ai.google.dev/) key, [Trigger.dev](https://trigger.dev) account
- **Web**: Node.js 18+ (or Bun)

## Quick start

### 1. Extension

1. Download the latest release from [Releases](https://github.com/AlanviewGroup0/legalvision-gemini-hackathon/releases/tag/V0.1) or clone and zip the `ext/` folder.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `ext` folder (or the extracted ZIP).
3. Point the extension at your API in `ext/config.js` by setting `serverUrl` (e.g. your deployed server URL or `http://localhost:3000` for local dev).

### 2. Server

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, GEMINI_API_KEY, TRIGGER_SECRET_KEY, TRIGGER_PROJECT_REF

bun install
bun run db:generate
bun run db:push
bun run dev
```

API runs at `http://localhost:3000`. Background analysis runs via Trigger.dev — deploy tasks with `bun run deploy:trigger`.

### 3. Web (landing page)

```bash
cd web
npm install
npm run dev
```

Then open the URL shown (e.g. `http://localhost:5173`).

## Deployment

- **Server**: Deploy the `server/` directory to [Vercel](https://vercel.com) (root directory = `server`). Set env vars: `DATABASE_URL`, `GEMINI_API_KEY`, `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`, `CORS_ORIGIN`.
- **Trigger.dev**: From `server/`, run `bun run deploy:trigger` so analysis jobs run in the cloud.
- **Web**: Deploy the `web/` app (e.g. Vite build) to Vercel or any static host.

## API overview

- `POST /api/analyze` – Submit URLs for legal analysis (returns job/scan ID or cached result).
- `GET /api/analyze/:jobId` – Poll job status and get analysis when complete.
- `GET /api/health` – Health check.

See [server/README.md](server/README.md) for full API details.

## License

See the repository for license information.
