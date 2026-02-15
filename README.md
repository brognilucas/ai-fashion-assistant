# AI Fashion Assistant

AI-powered outfit analyzer that scores your look on color harmony, fit, occasion appropriateness, and accessories using Claude vision.

## Features

- **Photo upload** — supports JPG, PNG, WebP, and GIF up to 4MB
- **Occasion context** — describe where you're going (e.g. job interview, wedding, casual brunch) for tailored advice
- **5-category scoring** (1-10) with actionable suggestions:
  - Color Harmony
  - Fit
  - Occasion Appropriateness
  - Accessories
  - Overall Assessment (with style profile label)

## How It Works

1. Upload a photo of your outfit
2. Optionally describe the occasion (e.g. "job interview", "beach wedding")
3. Claude Vision analyzes the image using 5 specialized tools
4. Get scored results with specific, actionable suggestions per category

Under the hood, the app uses the Vercel AI SDK's tool-calling pattern — Claude calls 5 analysis tools in sequence, each returning structured data validated by Zod schemas. This ensures consistent, typed responses every time.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **AI:** Vercel AI SDK v6 + Anthropic Claude (vision)
- **Styling:** Tailwind CSS v4
- **Validation:** Zod v4
- **Testing:** Jest 30 + React Testing Library
- **Deployment:** Vercel (via GitHub Actions)

## Project Structure

```
src/
├── app/
│   ├── api/analyze/route.ts    # AI analysis endpoint
│   ├── page.tsx                # Main UI (upload + results)
│   └── __tests__/              # Page and API route tests
└── lib/
    ├── constants.ts            # File size limits, accepted types
    ├── prompts/stylist.ts      # System and user prompts
    └── schemas/analysis.ts     # Zod schemas for structured output
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- An Anthropic API key

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy the environment file and add your API key:
   ```bash
   cp .env.example .env.local
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## Testing

```bash
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:ci       # CI mode with coverage
```

## Deployment

Deployment is handled automatically via GitHub Actions:

- **Pull Requests** trigger preview deployments
- **Pushes to main** trigger production deployments

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel authentication token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

The `ANTHROPIC_API_KEY` should be set in Vercel project environment variables (not GitHub secrets).

## License

MIT