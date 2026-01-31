# HumanQL

Query your database using natural language. AI generates SQL, you get the data.

## Features

- PostgreSQL and MySQL support
- Natural language to SQL (GPT-4o)
- Read-only mode by default (optional write access)
- Bilingual UI (English / Russian)
- Export to CSV
- Dark theme

## Deploy to Railway

1. Connect your GitHub repo to Railway
2. Add environment variable:
   ```
   OPENAI_API_KEY=sk-your-api-key
   ```
3. Deploy

Railway will auto-detect Next.js and configure the build.

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your OpenAI API key
cp .env.example .env.local

# Run dev server
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- OpenAI GPT-4o
- PostgreSQL (`pg`) / MySQL (`mysql2`)
