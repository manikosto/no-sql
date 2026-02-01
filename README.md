# HumanQL

Query your database using natural language. AI generates SQL, you get the data.

## Features

- PostgreSQL and MySQL support
- Natural language to SQL (GPT-4o or local LLM)
- Read-only mode by default (optional write access)
- Bilingual UI (English / Russian)
- Export to CSV
- Dark theme with neon ambilight
- Demo mode to try without your own database

### SQL Generation

- **Smart JOINs**: Detects foreign keys and infers relationships from naming conventions
- **Full SQL support**: SELECT with JOIN, WHERE, GROUP BY, HAVING, ORDER BY, subqueries, CTEs
- **Dialect-aware**: PostgreSQL (ILIKE, INTERVAL) vs MySQL (backticks, DATE_SUB)
- **Auto-retry**: If query fails, AI attempts to fix it automatically
- **Few-shot learning**: Built-in examples for aggregations, date filters, text search

### Privacy Options

- **Privacy Mode**: Disable AI summaries (data stays local)
- **Schema Anonymization**: Send generic names to LLM (table_1, col_1)
- **Local LLM**: Full offline mode with Ollama/LocalAI

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

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `LLM_BASE_URL` | Custom LLM endpoint (for local models) | OpenAI |
| `LLM_API_KEY` | API key for custom LLM | `OPENAI_API_KEY` |
| `LLM_MODEL` | Model for SQL generation | `gpt-4o` |
| `LLM_MODEL_FAST` | Model for summaries | `gpt-4o-mini` |

## Docker (Full Privacy Mode)

Run everything locally with one command — no data leaves your machine:

```bash
docker-compose up
```

This starts:
- HumanQL on http://localhost:3000
- Ollama with llama3.1 on http://localhost:11434

First run will download the model (~4GB). After that, pull the model manually:

```bash
docker exec -it humanql-ollama-1 ollama pull llama3.1
```

For GPU support (NVIDIA), uncomment the `deploy` section in `docker-compose.yml`.

## Using Local LLM (Ollama, LocalAI, etc.)

You can use a local LLM instead of OpenAI for full privacy:

```bash
# .env.local
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=not-needed
LLM_MODEL=llama3.1
LLM_MODEL_FAST=llama3.1
```

Compatible with any OpenAI-compatible API:
- [Ollama](https://ollama.ai)
- [LocalAI](https://localai.io)
- [LM Studio](https://lmstudio.ai)
- [vLLM](https://vllm.ai)
- [text-generation-webui](https://github.com/oobabooga/text-generation-webui)

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- OpenAI GPT-4o (or compatible local LLM)
- PostgreSQL (`pg`) / MySQL (`mysql2`)
