import { Pool, PoolConfig } from 'pg';
import { DatabaseSchema, TableSchema } from './types';

export async function createPool(connectionString: string): Promise<Pool> {
  const config: PoolConfig = {
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  };

  const pool = new Pool(config);
  return pool;
}

export async function getSchema(pool: Pool): Promise<DatabaseSchema> {
  const tablesQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const tablesResult = await pool.query(tablesQuery);

  const tables: TableSchema[] = [];

  for (const row of tablesResult.rows) {
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columnsResult = await pool.query(columnsQuery, [row.table_name]);

    tables.push({
      name: row.table_name,
      columns: columnsResult.rows.map((col) => ({
        name: col.column_name,
        type: col.data_type,
      })),
    });
  }

  return { tables };
}

export async function executeQuery(
  pool: Pool,
  sql: string,
  timeoutMs: number = 10000
): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
  const client = await pool.connect();

  try {
    // Set statement timeout
    await client.query(`SET statement_timeout = ${timeoutMs}`);

    const result = await client.query(sql);

    const columns = result.fields.map((f) => f.name);

    return {
      rows: result.rows,
      columns,
    };
  } finally {
    client.release();
  }
}
