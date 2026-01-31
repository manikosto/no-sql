const FORBIDDEN_KEYWORDS_READONLY = [
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'CALL',
];

// Even in write mode, these are always forbidden
const ALWAYS_FORBIDDEN = [
  'DROP',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
];

export function validateSQL(sql: string, readOnlyMode: boolean = true): { valid: boolean; error?: string } {
  const upperSQL = sql.toUpperCase();
  const forbiddenKeywords = readOnlyMode ? FORBIDDEN_KEYWORDS_READONLY : ALWAYS_FORBIDDEN;

  for (const keyword of forbiddenKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(upperSQL)) {
      return {
        valid: false,
        error: `SQL contains forbidden keyword: ${keyword}.`,
      };
    }
  }

  if (readOnlyMode) {
    const trimmedSQL = sql.trim().toUpperCase();
    if (!trimmedSQL.startsWith('SELECT') && !trimmedSQL.startsWith('WITH')) {
      return {
        valid: false,
        error: 'Only SELECT queries are allowed.',
      };
    }
  }

  return { valid: true };
}

export function ensureLimit(sql: string, limit: number = 100): string {
  const upperSQL = sql.toUpperCase();

  // If already has LIMIT, don't add another
  if (upperSQL.includes('LIMIT')) {
    return sql;
  }

  // Remove trailing semicolon if present
  let cleanSQL = sql.trim();
  if (cleanSQL.endsWith(';')) {
    cleanSQL = cleanSQL.slice(0, -1);
  }

  return `${cleanSQL} LIMIT ${limit}`;
}
