export interface TableColumn {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  defaultValue?: string | null;
}

export interface ForeignKey {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
  rowCount?: number;
}

export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface QueryResult {
  sql: string;
  results: Record<string, unknown>[];
  columns: string[];
  summary: string | null;
}

export interface ConnectionResponse {
  success: boolean;
  schema?: DatabaseSchema;
  error?: string;
}

export interface QueryResponse {
  success: boolean;
  sql?: string;
  results?: Record<string, unknown>[];
  columns?: string[];
  error?: string;
}
