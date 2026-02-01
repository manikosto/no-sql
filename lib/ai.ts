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

// Build rich schema description with relationships
function buildSchemaDescription(schema: DatabaseSchema): string {
  const parts: string[] = [];

  for (const table of schema.tables) {
    const lines: string[] = [`TABLE: ${table.name}`];

    // Add row count hint if available
    if (table.rowCount !== undefined && table.rowCount > 0) {
      lines[0] += ` (~${table.rowCount.toLocaleString()} rows)`;
    }

    // Primary key
    if (table.primaryKey && table.primaryKey.length > 0) {
      lines.push(`  PRIMARY KEY: ${table.primaryKey.join(', ')}`);
    }

    // Columns with types
    lines.push('  COLUMNS:');
    for (const col of table.columns) {
      let colDesc = `    - ${col.name}: ${col.type}`;
      if (col.isPrimaryKey) colDesc += ' [PK]';
      if (col.nullable === false) colDesc += ' [NOT NULL]';
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
          hints.push(`${table.name}.${col.name} likely references ${potentialTable}.id`);
        } else if (tableNames.has(pluralTable)) {
          hints.push(`${table.name}.${col.name} likely references ${pluralTable}.id`);
        }
      }
    }
  }

  return hints;
}

// Few-shot examples for common query patterns
const FEW_SHOT_EXAMPLES = `
EXAMPLES of good queries:

Q: "How many users are there?"
A: SELECT COUNT(*) FROM users;

Q: "Show top 10 customers by order value"
A: SELECT c.id, c.name, SUM(o.total) as total_spent
   FROM customers c
   JOIN orders o ON c.id = o.customer_id
   GROUP BY c.id, c.name
   ORDER BY total_spent DESC
   LIMIT 10;

Q: "Users who registered last month"
A: SELECT * FROM users
   WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
     AND created_at < DATE_TRUNC('month', CURRENT_DATE)
   LIMIT 100;

Q: "Orders with product details"
A: SELECT o.id, o.total, o.status, p.name as product_name, oi.quantity
   FROM orders o
   JOIN order_items oi ON o.id = oi.order_id
   JOIN products p ON oi.product_id = p.id
   LIMIT 100;

Q: "Average order value by status"
A: SELECT status, AVG(total) as avg_total, COUNT(*) as order_count
   FROM orders
   GROUP BY status
   ORDER BY avg_total DESC;

Q: "Products that have never been ordered"
A: SELECT p.*
   FROM products p
   LEFT JOIN order_items oi ON p.id = oi.product_id
   WHERE oi.id IS NULL
   LIMIT 100;

Q: "Search users by name"
A: SELECT * FROM users
   WHERE name ILIKE '%search_term%'
   LIMIT 100;
`;

// Dialect-specific tips
function getDialectTips(dbType: DatabaseType): string {
  if (dbType === 'mysql') {
    return `
MySQL SYNTAX TIPS:
- Use backticks for identifiers: \`table_name\`
- String concatenation: CONCAT(a, b)
- Case-insensitive LIKE is default
- Date functions: DATE_SUB(NOW(), INTERVAL 1 MONTH), CURDATE()
- LIMIT goes at the end: LIMIT 100
- Use IFNULL() for null handling
- Boolean: 1/0 or TRUE/FALSE`;
  }

  return `
PostgreSQL SYNTAX TIPS:
- Use double quotes for identifiers if needed: "table_name"
- String concatenation: || operator or CONCAT()
- Use ILIKE for case-insensitive matching
- Date functions: NOW() - INTERVAL '1 month', CURRENT_DATE
- LIMIT goes at the end: LIMIT 100
- Use COALESCE() for null handling
- Boolean: true/false`;
}

export async function generateSQL(
  question: string,
  schema: DatabaseSchema,
  dbType: DatabaseType,
  readOnlyMode: boolean = true
): Promise<string> {
  const schemaDescription = buildSchemaDescription(schema);
  const inferredRelations = inferRelationships(schema);
  const dialectTips = getDialectTips(dbType);

  const queryRules = readOnlyMode
    ? `ALLOWED: SELECT (with JOIN, WHERE, GROUP BY, HAVING, ORDER BY, subqueries, UNION, CTEs)
FORBIDDEN: INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE, GRANT`
    : `ALLOWED: SELECT, INSERT, UPDATE, DELETE
FORBIDDEN: DROP, TRUNCATE, ALTER, CREATE, GRANT, REVOKE`;

  const systemPrompt = `You are an expert ${dbType.toUpperCase()} query generator. Your task is to convert natural language questions into precise, efficient SQL queries.

STRICT RULES:
1. ONLY use tables and columns that exist in the schema below
2. NEVER invent or guess column names - if unsure, use SELECT * or COUNT(*)
3. ${queryRules}
4. Always add LIMIT 100 to SELECT queries (unless aggregating or user specifies otherwise)
5. Return ONLY the raw SQL query - no markdown, no backticks, no explanations
6. Prefer explicit JOINs over implicit (comma) joins
7. Use table aliases for readability in multi-table queries
8. For text search, use ILIKE (PostgreSQL) or LIKE (MySQL) with wildcards

${dialectTips}

DATABASE SCHEMA:
${schemaDescription}
${inferredRelations.length > 0 ? `\nINFERRED RELATIONSHIPS:\n${inferredRelations.map(r => '- ' + r).join('\n')}` : ''}

${FEW_SHOT_EXAMPLES}

Now generate a query for the user's question. Double-check that every table and column exists in the schema above.`;

  const response = await openai.chat.completions.create({
    model: MODEL_SQL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
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

// Attempt to fix a failed SQL query
export async function fixSQL(
  originalQuestion: string,
  failedSQL: string,
  errorMessage: string,
  schema: DatabaseSchema,
  dbType: DatabaseType
): Promise<string> {
  const schemaDescription = buildSchemaDescription(schema);

  const systemPrompt = `You are an expert ${dbType.toUpperCase()} query debugger. A SQL query failed and you need to fix it.

SCHEMA:
${schemaDescription}

RULES:
1. Fix the error while maintaining the original intent
2. ONLY use tables and columns from the schema above
3. Return ONLY the corrected SQL - no explanations
4. Add LIMIT 100 if missing`;

  const userPrompt = `Original question: "${originalQuestion}"

Failed SQL:
${failedSQL}

Error: ${errorMessage}

Please fix this query.`;

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
