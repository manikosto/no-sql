import { NextRequest, NextResponse } from 'next/server';
import { createAdapter, DatabaseType } from '@/lib/db-adapter';
import { generateSQL, generateSummary } from '@/lib/ai';
import { validateSQL, ensureLimit } from '@/lib/security';
import { DatabaseSchema } from '@/lib/types';
import { anonymizeSchema, deanonymizeSQL } from '@/lib/schema-anonymizer';

// Demo data for testing without real database
const demoData: Record<string, { rows: Record<string, unknown>[]; columns: string[] }> = {
  users: {
    columns: ['id', 'email', 'name', 'created_at', 'is_active'],
    rows: [
      { id: 1, email: 'john@example.com', name: 'John Doe', created_at: '2024-01-15', is_active: true },
      { id: 2, email: 'jane@example.com', name: 'Jane Smith', created_at: '2024-02-20', is_active: true },
      { id: 3, email: 'bob@example.com', name: 'Bob Wilson', created_at: '2024-03-10', is_active: false },
      { id: 4, email: 'alice@example.com', name: 'Alice Brown', created_at: '2024-04-05', is_active: true },
      { id: 5, email: 'charlie@example.com', name: 'Charlie Davis', created_at: '2024-05-01', is_active: true },
    ],
  },
  orders: {
    columns: ['id', 'user_id', 'total', 'status', 'created_at'],
    rows: [
      { id: 1, user_id: 1, total: 150.00, status: 'completed', created_at: '2024-01-20' },
      { id: 2, user_id: 2, total: 89.99, status: 'completed', created_at: '2024-02-25' },
      { id: 3, user_id: 1, total: 220.50, status: 'pending', created_at: '2024-03-15' },
      { id: 4, user_id: 3, total: 45.00, status: 'cancelled', created_at: '2024-04-10' },
      { id: 5, user_id: 4, total: 310.00, status: 'completed', created_at: '2024-05-05' },
    ],
  },
  products: {
    columns: ['id', 'name', 'price', 'category', 'stock'],
    rows: [
      { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
      { id: 2, name: 'Headphones', price: 79.99, category: 'Electronics', stock: 200 },
      { id: 3, name: 'Coffee Mug', price: 12.99, category: 'Kitchen', stock: 500 },
      { id: 4, name: 'Notebook', price: 5.99, category: 'Office', stock: 1000 },
      { id: 5, name: 'Mouse', price: 29.99, category: 'Electronics', stock: 150 },
    ],
  },
  order_items: {
    columns: ['id', 'order_id', 'product_id', 'quantity', 'price'],
    rows: [
      { id: 1, order_id: 1, product_id: 1, quantity: 1, price: 999.99 },
      { id: 2, order_id: 1, product_id: 2, quantity: 2, price: 79.99 },
      { id: 3, order_id: 2, product_id: 3, quantity: 3, price: 12.99 },
      { id: 4, order_id: 3, product_id: 4, quantity: 10, price: 5.99 },
      { id: 5, order_id: 5, product_id: 1, quantity: 1, price: 999.99 },
    ],
  },
};

function executeDemoQuery(sql: string): { rows: Record<string, unknown>[]; columns: string[] } {
  const sqlLower = sql.toLowerCase();

  // Detect which table is being queried
  for (const table of Object.keys(demoData)) {
    if (sqlLower.includes(table)) {
      // Handle COUNT queries
      if (sqlLower.includes('count(')) {
        return {
          columns: ['count'],
          rows: [{ count: demoData[table].rows.length }],
        };
      }

      // Handle SUM queries for orders
      if (sqlLower.includes('sum(') && table === 'orders') {
        const total = demoData.orders.rows.reduce((sum, row) => sum + (row.total as number), 0);
        return {
          columns: ['sum'],
          rows: [{ sum: total }],
        };
      }

      // Return table data
      return demoData[table];
    }
  }

  // Default: return users
  return demoData.users;
}

export async function POST(request: NextRequest) {
  try {
    const {
      connectionString,
      question,
      schema,
      dbType,
      readOnlyMode = true,
      locale = 'en',
      privacyMode = false,
      anonymizeMode = false
    } = await request.json();

    if (!connectionString || !question || !schema || !dbType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const isDemo = connectionString === 'demo';

    // Anonymize schema if enabled
    let schemaForAI = schema as DatabaseSchema;
    let anonymizationMap = null;

    if (anonymizeMode) {
      const { anonymizedSchema, map } = anonymizeSchema(schema as DatabaseSchema);
      schemaForAI = anonymizedSchema;
      anonymizationMap = map;
    }

    // Generate SQL using AI (with anonymized or real schema)
    let sql = await generateSQL(question, schemaForAI, dbType as DatabaseType, readOnlyMode);

    // Deanonymize SQL if we used anonymization
    if (anonymizeMode && anonymizationMap) {
      sql = deanonymizeSQL(sql, anonymizationMap);
    }

    // Validate SQL for security
    const validation = validateSQL(sql, readOnlyMode);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Ensure LIMIT is present
    sql = ensureLimit(sql, 100);

    let rows: Record<string, unknown>[];
    let columns: string[];

    if (isDemo) {
      // Demo mode: use fake data
      const result = executeDemoQuery(sql);
      rows = result.rows;
      columns = result.columns;
    } else {
      // Real database: execute query
      // Use DATABASE_URL from env if connectionString is 'env'
      const connStr = connectionString === 'env' ? process.env.DATABASE_URL! : connectionString;
      const adapter = createAdapter(dbType as DatabaseType, connStr);

      try {
        await adapter.connect();
        const result = await adapter.executeQuery(sql, 10000);
        rows = result.rows;
        columns = result.columns;
        await adapter.disconnect();
      } catch (error) {
        await adapter.disconnect().catch(() => {});
        throw error;
      }
    }

    // Generate summary (skip in privacy mode)
    const summary = privacyMode ? null : await generateSummary(question, sql, rows, columns, locale);

    return NextResponse.json({
      success: true,
      sql,
      results: rows,
      columns,
      summary,
      isDemo,
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute query',
      },
      { status: 500 }
    );
  }
}
