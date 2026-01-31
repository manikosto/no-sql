import OpenAI from 'openai';
import { DatabaseSchema } from './types';
import { DatabaseType } from './db-adapter';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSQL(
  question: string,
  schema: DatabaseSchema,
  dbType: DatabaseType,
  readOnlyMode: boolean = true
): Promise<string> {
  const schemaDescription = schema.tables
    .map((table) => {
      const columns = table.columns
        .map((col) => `  - ${col.name} (${col.type})`)
        .join('\n');
      return `Table: ${table.name}\nColumns:\n${columns}`;
    })
    .join('\n\n');

  const dialectInfo = dbType === 'mysql'
    ? 'MySQL (use backticks for identifiers, LIMIT at end)'
    : 'PostgreSQL (use double quotes for identifiers if needed)';

  const queryRules = readOnlyMode
    ? '3. Only SELECT statements. Add LIMIT 100 if not specified.'
    : '3. SELECT, INSERT, UPDATE, DELETE are allowed. For SELECT add LIMIT 100 if not specified. Never use DROP, TRUNCATE, ALTER, CREATE, GRANT, REVOKE.';

  const systemPrompt = `You are a ${dialectInfo} query generator. You MUST follow these rules EXACTLY:

1. ONLY use tables and columns from the schema below. Do NOT invent columns.
2. If you cannot find an exact column match, use SELECT * or COUNT(*) from the most relevant table.
${queryRules}
4. Return ONLY raw SQL. No markdown, no backticks, no explanations.
5. Use correct syntax for ${dbType.toUpperCase()}.

SCHEMA (these are the ONLY valid tables and columns):
${schemaDescription}

IMPORTANT: Before writing the query, verify every column name exists in the schema above. If "is_teacher", "role", "type", or any column is NOT in the schema - DO NOT USE IT.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    temperature: 0,
    max_tokens: 500,
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

export async function generateSummary(
  question: string,
  sql: string,
  results: Record<string, unknown>[],
  columns: string[]
): Promise<string> {
  const rowCount = results.length;

  // Prepare a sample of data for context (first 5 rows)
  const sampleData = results.slice(0, 5).map(row =>
    columns.map(col => `${col}: ${row[col]}`).join(', ')
  ).join('\n');

  const systemPrompt = `Ты аналитик данных. Кратко опиши результаты запроса на русском.

Правила:
- Максимум 1-2 предложения
- Только факты: количество записей и ключевые данные
- Без вводных фраз типа "В результате запроса..."
- Без предложений помощи типа "Если нужно больше данных..."
- Просто сухие факты`;

  const userPrompt = `Вопрос: "${question}"
Найдено строк: ${rowCount}
Колонки: ${columns.join(', ')}
${rowCount > 0 ? `Данные:\n${sampleData}` : 'Данных нет.'}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() || `Найдено ${rowCount} записей.`;
}
