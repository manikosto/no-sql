import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import { DatabaseSchema, TableSchema, ForeignKey } from './types';

export type DatabaseType = 'postgresql' | 'mysql';

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getSchema(): Promise<DatabaseSchema>;
  executeQuery(sql: string, timeoutMs?: number): Promise<{ rows: Record<string, unknown>[]; columns: string[] }>;
  checkWriteAccess(): Promise<boolean>;
}

// PostgreSQL Adapter
export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: PgPool | null = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async connect(): Promise<void> {
    this.pool = new PgPool({
      connectionString: this.connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
    await this.pool.query('SELECT 1');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async getSchema(): Promise<DatabaseSchema> {
    if (!this.pool) throw new Error('Not connected');

    const tablesResult = await this.pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables: TableSchema[] = [];

    for (const row of tablesResult.rows) {
      // Get columns with more metadata
      const columnsResult = await this.pool.query(
        `SELECT
           c.column_name,
           c.data_type,
           c.is_nullable,
           c.column_default,
           CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
         FROM information_schema.columns c
         LEFT JOIN (
           SELECT kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_schema = 'public'
             AND tc.table_name = $1
             AND tc.constraint_type = 'PRIMARY KEY'
         ) pk ON c.column_name = pk.column_name
         WHERE c.table_schema = 'public'
           AND c.table_name = $1
         ORDER BY c.ordinal_position;`,
        [row.table_name]
      );

      // Get foreign keys
      const fkResult = await this.pool.query(
        `SELECT
           kcu.column_name,
           ccu.table_name AS references_table,
           ccu.column_name AS references_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = 'public'
           AND tc.table_name = $1
           AND tc.constraint_type = 'FOREIGN KEY';`,
        [row.table_name]
      );

      // Get approximate row count (fast, doesn't lock table)
      const countResult = await this.pool.query(
        `SELECT reltuples::bigint AS estimate
         FROM pg_class
         WHERE relname = $1;`,
        [row.table_name]
      );

      const foreignKeys: ForeignKey[] = fkResult.rows.map((fk) => ({
        column: fk.column_name,
        referencesTable: fk.references_table,
        referencesColumn: fk.references_column,
      }));

      const primaryKeys = columnsResult.rows
        .filter((col) => col.is_primary_key)
        .map((col) => col.column_name);

      tables.push({
        name: row.table_name,
        columns: columnsResult.rows.map((col) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          isPrimaryKey: col.is_primary_key,
          defaultValue: col.column_default,
        })),
        primaryKey: primaryKeys.length > 0 ? primaryKeys : undefined,
        foreignKeys: foreignKeys.length > 0 ? foreignKeys : undefined,
        rowCount: countResult.rows[0]?.estimate ?? undefined,
      });
    }

    return { tables };
  }

  async executeQuery(sql: string, timeoutMs: number = 10000): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
    if (!this.pool) throw new Error('Not connected');

    const client = await this.pool.connect();
    try {
      await client.query(`SET statement_timeout = ${timeoutMs}`);
      const result = await client.query(sql);
      return {
        rows: result.rows,
        columns: result.fields.map((f) => f.name),
      };
    } finally {
      client.release();
    }
  }

  async checkWriteAccess(): Promise<boolean> {
    if (!this.pool) throw new Error('Not connected');

    const writeCheckResult = await this.pool.query(`
      SELECT COUNT(*)::int as write_count
      FROM information_schema.table_privileges
      WHERE grantee = current_user
        AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
        AND table_schema = 'public'
    `);

    const hasWriteAccess = writeCheckResult.rows[0]?.write_count > 0;

    const superuserResult = await this.pool.query(`
      SELECT rolsuper FROM pg_roles WHERE rolname = current_user
    `);
    const isSuperuser = superuserResult.rows[0]?.rolsuper === true;

    return hasWriteAccess || isSuperuser;
  }
}

// MySQL Adapter
export class MySQLAdapter implements DatabaseAdapter {
  private connection: mysql.Connection | null = null;
  private connectionString: string;
  private database: string = '';

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    // Extract database name from connection string
    const match = connectionString.match(/\/([^/?]+)(\?|$)/);
    if (match) {
      this.database = match[1];
    }
  }

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection(this.connectionString);
    await this.connection.query('SELECT 1');
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async getSchema(): Promise<DatabaseSchema> {
    if (!this.connection) throw new Error('Not connected');

    const [tablesRows] = await this.connection.query<mysql.RowDataPacket[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `, [this.database]);

    const tables: TableSchema[] = [];

    for (const row of tablesRows) {
      const tableName = row.table_name || row.TABLE_NAME;

      // Get columns with more metadata
      const [columnsRows] = await this.connection.query<mysql.RowDataPacket[]>(
        `SELECT
           column_name,
           data_type,
           is_nullable,
           column_default,
           column_key
         FROM information_schema.columns
         WHERE table_schema = ?
           AND table_name = ?
         ORDER BY ordinal_position;`,
        [this.database, tableName]
      );

      // Get foreign keys
      const [fkRows] = await this.connection.query<mysql.RowDataPacket[]>(
        `SELECT
           column_name,
           referenced_table_name,
           referenced_column_name
         FROM information_schema.key_column_usage
         WHERE table_schema = ?
           AND table_name = ?
           AND referenced_table_name IS NOT NULL;`,
        [this.database, tableName]
      );

      // Get approximate row count
      const [countRows] = await this.connection.query<mysql.RowDataPacket[]>(
        `SELECT table_rows
         FROM information_schema.tables
         WHERE table_schema = ?
           AND table_name = ?;`,
        [this.database, tableName]
      );

      const foreignKeys: ForeignKey[] = fkRows.map((fk) => ({
        column: fk.column_name || fk.COLUMN_NAME,
        referencesTable: fk.referenced_table_name || fk.REFERENCED_TABLE_NAME,
        referencesColumn: fk.referenced_column_name || fk.REFERENCED_COLUMN_NAME,
      }));

      const primaryKeys = columnsRows
        .filter((col) => (col.column_key || col.COLUMN_KEY) === 'PRI')
        .map((col) => col.column_name || col.COLUMN_NAME);

      tables.push({
        name: tableName,
        columns: columnsRows.map((col) => ({
          name: col.column_name || col.COLUMN_NAME,
          type: col.data_type || col.DATA_TYPE,
          nullable: (col.is_nullable || col.IS_NULLABLE) === 'YES',
          isPrimaryKey: (col.column_key || col.COLUMN_KEY) === 'PRI',
          defaultValue: col.column_default || col.COLUMN_DEFAULT,
        })),
        primaryKey: primaryKeys.length > 0 ? primaryKeys : undefined,
        foreignKeys: foreignKeys.length > 0 ? foreignKeys : undefined,
        rowCount: countRows[0]?.table_rows ?? countRows[0]?.TABLE_ROWS ?? undefined,
      });
    }

    return { tables };
  }

  async executeQuery(sql: string, timeoutMs: number = 10000): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
    if (!this.connection) throw new Error('Not connected');

    // Set timeout
    await this.connection.query(`SET SESSION MAX_EXECUTION_TIME = ${timeoutMs}`);

    const [rows, fields] = await this.connection.query<mysql.RowDataPacket[]>(sql);

    return {
      rows: rows as Record<string, unknown>[],
      columns: fields ? (fields as mysql.FieldPacket[]).map((f) => f.name) : Object.keys(rows[0] || {}),
    };
  }

  async checkWriteAccess(): Promise<boolean> {
    if (!this.connection) throw new Error('Not connected');

    try {
      const [rows] = await this.connection.query<mysql.RowDataPacket[]>(`
        SELECT COUNT(*) as write_count
        FROM information_schema.table_privileges
        WHERE grantee LIKE CONCAT('%', SUBSTRING_INDEX(CURRENT_USER(), '@', 1), '%')
          AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
          AND table_schema = ?
      `, [this.database]);

      return (rows[0]?.write_count || 0) > 0;
    } catch {
      // If we can't check, assume write access for safety
      return true;
    }
  }
}

export function createAdapter(type: DatabaseType, connectionString: string): DatabaseAdapter {
  switch (type) {
    case 'postgresql':
      return new PostgreSQLAdapter(connectionString);
    case 'mysql':
      return new MySQLAdapter(connectionString);
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

export function detectDatabaseType(connectionString: string): DatabaseType | null {
  if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
    return 'postgresql';
  }
  if (connectionString.startsWith('mysql://')) {
    return 'mysql';
  }
  return null;
}
