import { DatabaseSchema, TableSchema } from './types';

export interface AnonymizationMap {
  tables: Record<string, string>; // real -> anonymous
  columns: Record<string, Record<string, string>>; // table -> { real -> anonymous }
  reverse: {
    tables: Record<string, string>; // anonymous -> real
    columns: Record<string, Record<string, string>>; // table -> { anonymous -> real }
  };
}

export function anonymizeSchema(schema: DatabaseSchema): {
  anonymizedSchema: DatabaseSchema;
  map: AnonymizationMap;
} {
  const map: AnonymizationMap = {
    tables: {},
    columns: {},
    reverse: {
      tables: {},
      columns: {},
    },
  };

  const anonymizedTables: TableSchema[] = schema.tables.map((table, tableIndex) => {
    const anonymousTableName = `table_${tableIndex + 1}`;
    map.tables[table.name] = anonymousTableName;
    map.reverse.tables[anonymousTableName] = table.name;
    map.columns[table.name] = {};
    map.reverse.columns[anonymousTableName] = {};

    const anonymizedColumns = table.columns.map((col, colIndex) => {
      const anonymousColName = `col_${colIndex + 1}`;
      map.columns[table.name][col.name] = anonymousColName;
      map.reverse.columns[anonymousTableName][anonymousColName] = col.name;

      return {
        name: anonymousColName,
        type: col.type, // Keep type for LLM to understand data structure
        nullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey,
      };
    });

    // Anonymize primary key column names
    const anonymizedPrimaryKey = table.primaryKey?.map(
      pk => map.columns[table.name][pk] || pk
    );

    // Anonymize foreign keys
    const anonymizedForeignKeys = table.foreignKeys?.map(fk => ({
      column: map.columns[table.name][fk.column] || fk.column,
      referencesTable: map.tables[fk.referencesTable] || fk.referencesTable,
      referencesColumn: map.columns[fk.referencesTable]?.[fk.referencesColumn] || fk.referencesColumn,
    }));

    return {
      name: anonymousTableName,
      columns: anonymizedColumns,
      primaryKey: anonymizedPrimaryKey,
      foreignKeys: anonymizedForeignKeys,
      rowCount: table.rowCount,
    };
  });

  return {
    anonymizedSchema: { tables: anonymizedTables },
    map,
  };
}

export function deanonymizeSQL(sql: string, map: AnonymizationMap): string {
  let result = sql;

  // Replace table names (longer names first to avoid partial replacements)
  const sortedTables = Object.entries(map.reverse.tables)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [anonymous, real] of sortedTables) {
    // Replace with word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${anonymous}\\b`, 'gi');
    result = result.replace(regex, real);
  }

  // Replace column names for each table
  for (const [, columns] of Object.entries(map.reverse.columns)) {
    const sortedColumns = Object.entries(columns)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [anonymous, real] of sortedColumns) {
      const regex = new RegExp(`\\b${anonymous}\\b`, 'gi');
      result = result.replace(regex, real);
    }
  }

  return result;
}
