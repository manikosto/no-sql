import OpenAI from 'openai';
import { DatabaseSchema } from './types';
import { DatabaseType } from './db-adapter';

// Support for local LLMs (Ollama, LocalAI, LM Studio, vLLM, etc.)
// Set LLM_BASE_URL to use a custom endpoint (e.g., http://localhost:11434/v1)
const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || 'not-needed',
  baseURL: process.env.LLM_BASE_URL || undefined,
});

// Models can be configured via environment variables
const MODEL_SQL = process.env.LLM_MODEL || 'gpt-4o';
const MODEL_SUMMARY = process.env.LLM_MODEL_FAST || process.env.LLM_MODEL || 'gpt-4o-mini';

// Build a compact schema representation - just table.column list
function buildCompactSchema(schema: DatabaseSchema): string {
  const lines: string[] = [];
  for (const table of schema.tables) {
    const cols = table.columns.map(c => c.name).join(', ');
    lines.push(`${table.name}: ${cols}`);
  }
  return lines.join('\n');
}

// Build rich schema description with relationships
function buildSchemaDescription(schema: DatabaseSchema): string {
  const parts: string[] = [];

  for (const table of schema.tables) {
    const lines: string[] = [`TABLE: ${table.name}`];

    // Columns with types - ONLY show what exists
    lines.push('  COLUMNS (ONLY THESE EXIST):');
    for (const col of table.columns) {
      let colDesc = `    - ${col.name}: ${col.type}`;
      if (col.isPrimaryKey) colDesc += ' [PK]';
      lines.push(colDesc);
    }

    // Foreign keys (relationships)
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      lines.push('  FOREIGN KEYS:');
      for (const fk of table.foreignKeys) {
        lines.push(`    - ${fk.column} -> ${fk.referencesTable}.${fk.referencesColumn}`);
      }
    }

    parts.push(lines.join('\n'));
  }

  return parts.join('\n\n');
}

// Detect relationships from naming conventions (user_id -> users.id)
function inferRelationships(schema: DatabaseSchema): string[] {
  const hints: string[] = [];
  const tableNames = new Set(schema.tables.map(t => t.name.toLowerCase()));

  for (const table of schema.tables) {
    for (const col of table.columns) {
      const colLower = col.name.toLowerCase();

      // Pattern: user_id, customer_id, order_id, etc.
      if (colLower.endsWith('_id') && colLower !== 'id') {
        const potentialTable = colLower.slice(0, -3); // Remove '_id'
        const pluralTable = potentialTable + 's';

        if (tableNames.has(potentialTable)) {
          hints.push(`${table.name}.${col.name} -> ${potentialTable}.id`);
        } else if (tableNames.has(pluralTable)) {
          hints.push(`${table.name}.${col.name} -> ${pluralTable}.id`);
        }
      }
    }
  }

  return hints;
}

// Dialect-specific tips
function getDialectTips(dbType: DatabaseType): string {
  if (dbType === 'mysql') {
    return `MySQL: backticks for identifiers, IFNULL(), DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
  }
  return `PostgreSQL: ILIKE for case-insensitive, COALESCE(), NOW() - INTERVAL '1 month'`;
}

export async function generateSQL(
  question: string,
  schema: DatabaseSchema,
  dbType: DatabaseType,
  readOnlyMode: boolean = true
): Promise<string> {
  const schemaDescription = buildSchemaDescription(schema);
  const compactSchema = buildCompactSchema(schema);
  const inferredRelations = inferRelationships(schema);
  const dialectTips = getDialectTips(dbType);

  const queryRules = readOnlyMode
    ? 'Only SELECT allowed. No INSERT/UPDATE/DELETE.'
    : 'SELECT, INSERT, UPDATE, DELETE allowed. No DROP/TRUNCATE/ALTER.';

  // Very strict prompt focused on not inventing columns
  const systemPrompt = `You are a ${dbType.toUpperCase()} SQL generator. Convert questions to SQL.

CRITICAL RULES - VIOLATION CAUSES ERRORS:
1. USE ONLY COLUMNS FROM THE SCHEMA BELOW. Do NOT invent columns.
2. If you're unsure which column to use, use COUNT(*) or SELECT * instead of guessing.
3. Before writing any column name, verify it exists in the schema.
4. ${queryRules}
5. Add LIMIT 100 to non-aggregate SELECT queries.
6. Return ONLY raw SQL. No markdown, no backticks, no explanation.

${dialectTips}

=== VALID TABLES AND COLUMNS (USE ONLY THESE) ===
${compactSchema}

=== DETAILED SCHEMA ===
${schemaDescription}
${inferredRelations.length > 0 ? `\nRELATIONSHIPS:\n${inferredRelations.join('\n')}` : ''}

EXAMPLES:
Q: "How many users?" → SELECT COUNT(*) FROM user;
Q: "Show all orders" → SELECT * FROM orders LIMIT 100;
Q: "Users with their orders" → SELECT u.*, o.* FROM user u JOIN orders o ON u.id = o.user_id LIMIT 100;

REMEMBER: If a column doesn't appear in the schema above, DO NOT USE IT. Use * or COUNT(*) instead.`;

  const response = await openai.chat.completions.create({
    model: MODEL_SQL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Question: ${question}\n\nGenerate SQL using ONLY columns from the schema. If unsure, use SELECT * or COUNT(*).` },
    ],
    temperature: 0,
    max_tokens: 1000,
  });

  const sql = response.choices[0]?.message?.content?.trim() || '';

  // Clean up any markdown code blocks if present
  let cleanSQL = sql;
  if (cleanSQL.startsWith('```sql')) {
    cleanSQL = cleanSQL.slice(6);
  } else if (cleanSQL.startsWith('```')) {
    cleanSQL = cleanSQL.slice(3);
  }
  if (cleanSQL.endsWith('```')) {
    cleanSQL = cleanSQL.slice(0, -3);
  }

  return cleanSQL.trim();
}

// Attempt to fix a failed SQL query with explicit error context
export async function fixSQL(
  originalQuestion: string,
  failedSQL: string,
  errorMessage: string,
  schema: DatabaseSchema,
  dbType: DatabaseType
): Promise<string> {
  const compactSchema = buildCompactSchema(schema);

  // Extract which column was invalid from error message
  const columnMatch = errorMessage.match(/column "([^"]+)" does not exist/i) ||
                      errorMessage.match(/Unknown column '([^']+)'/i);
  const invalidColumn = columnMatch ? columnMatch[1] : null;

  // Find which table might be relevant based on the failed SQL
  const relevantTables: string[] = [];
  for (const table of schema.tables) {
    if (failedSQL.toLowerCase().includes(table.name.toLowerCase())) {
      relevantTables.push(table.name);
    }
  }

  // Build specific guidance about valid columns for relevant tables
  let columnGuidance = '';
  if (relevantTables.length > 0) {
    const tableInfo = relevantTables.map(tableName => {
      const table = schema.tables.find(t => t.name === tableName);
      if (table) {
        return `${tableName} has ONLY these columns: ${table.columns.map(c => c.name).join(', ')}`;
      }
      return '';
    }).filter(Boolean);
    columnGuidance = `\n\nVALID COLUMNS FOR TABLES IN YOUR QUERY:\n${tableInfo.join('\n')}`;
  }

  const systemPrompt = `Fix this SQL error. The query used a column that doesn't exist.

VALID TABLES AND COLUMNS:
${compactSchema}
${columnGuidance}

RULES:
1. Remove or replace the invalid column with one that EXISTS in the schema
2. If you can't find a matching column, use COUNT(*) or SELECT *
3. Return ONLY the fixed SQL - no explanations
4. The column "${invalidColumn}" does NOT exist - don't use it`;

  const userPrompt = `Original question: "${originalQuestion}"

Failed SQL:
${failedSQL}

Error: ${errorMessage}

Fix by using ONLY columns that exist in the schema above.`;

  const response = await openai.chat.completions.create({
    model: MODEL_SQL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0,
    max_tokens: 1000,
  });

  const sql = response.choices[0]?.message?.content?.trim() || '';

  // Clean up markdown
  let cleanSQL = sql;
  if (cleanSQL.startsWith('```sql')) {
    cleanSQL = cleanSQL.slice(6);
  } else if (cleanSQL.startsWith('```')) {
    cleanSQL = cleanSQL.slice(3);
  }
  if (cleanSQL.endsWith('```')) {
    cleanSQL = cleanSQL.slice(0, -3);
  }

  return cleanSQL.trim();
}

export async function generateSummary(
  question: string,
  sql: string,
  results: Record<string, unknown>[],
  columns: string[],
  locale: string = 'en'
): Promise<string> {
  const rowCount = results.length;

  // Prepare a sample of data for context (first 5 rows)
  const sampleData = results.slice(0, 5).map(row =>
    columns.map(col => `${col}: ${row[col]}`).join(', ')
  ).join('\n');

  const systemPrompt = locale === 'ru'
    ? `Ты аналитик данных. Кратко опиши результаты запроса на русском.

Правила:
- Максимум 1-2 предложения
- Только факты: количество записей и ключевые данные
- Без вводных фраз типа "В результате запроса..."
- Без предложений помощи типа "Если нужно больше данных..."
- Просто сухие факты`
    : `You are a data analyst. Briefly describe the query results in English.

Rules:
- Maximum 1-2 sentences
- Only facts: number of records and key data
- No introductory phrases like "The query returned..."
- No offers of help like "If you need more data..."
- Just dry facts`;

  const userPrompt = locale === 'ru'
    ? `Вопрос: "${question}"
Найдено строк: ${rowCount}
Колонки: ${columns.join(', ')}
${rowCount > 0 ? `Данные:\n${sampleData}` : 'Данных нет.'}`
    : `Question: "${question}"
Rows found: ${rowCount}
Columns: ${columns.join(', ')}
${rowCount > 0 ? `Data:\n${sampleData}` : 'No data.'}`;

  const response = await openai.chat.completions.create({
    model: MODEL_SUMMARY,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  const fallback = locale === 'ru' ? `Найдено ${rowCount} записей.` : `Found ${rowCount} records.`;
  return response.choices[0]?.message?.content?.trim() || fallback;
}
