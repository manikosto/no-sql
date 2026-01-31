export interface TableColumn {
  name: string;
  type: string;
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
}

export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface QueryResult {
  sql: string;
  results: Record<string, unknown>[];
  columns: string[];
  summary: string;
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
