import { NextRequest, NextResponse } from 'next/server';
import { createAdapter, DatabaseType } from '@/lib/db-adapter';
import { generateSQL, generateSummary, fixSQL } from '@/lib/ai';
import { validateSQL, ensureLimit } from '@/lib/security';
import { DatabaseSchema } from '@/lib/types';
import { anonymizeSchema, deanonymizeSQL } from '@/lib/schema-anonymizer';

const MAX_RETRY_ATTEMPTS = 2;

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

  // Handle JOIN queries
  if (sqlLower.includes('join')) {
    // Orders with user info
    if (sqlLower.includes('orders') && sqlLower.includes('users')) {
      const rows = demoData.orders.rows.map(order => {
        const user = demoData.users.rows.find(u => u.id === order.user_id);
        return {
          order_id: order.id,
          order_total: order.total,
          order_status: order.status,
          user_name: user?.name || 'Unknown',
          user_email: user?.email || 'Unknown',
        };
      });
      return {
        columns: ['order_id', 'order_total', 'order_status', 'user_name', 'user_email'],
        rows,
      };
    }

    // Order items with product info
    if (sqlLower.includes('order_items') && sqlLower.includes('products')) {
      const rows = demoData.order_items.rows.map(item => {
        const product = demoData.products.rows.find(p => p.id === item.product_id);
        const order = demoData.orders.rows.find(o => o.id === item.order_id);
        return {
          order_id: item.order_id,
          product_name: product?.name || 'Unknown',
          quantity: item.quantity,
          item_price: item.price,
          order_status: order?.status || 'Unknown',
        };
      });
      return {
        columns: ['order_id', 'product_name', 'quantity', 'item_price', 'order_status'],
        rows,
      };
    }
  }

  // Handle aggregate queries
  if (sqlLower.includes('group by')) {
    // Orders by status
    if (sqlLower.includes('orders') && sqlLower.includes('status')) {
      const statusGroups: Record<string, { count: number; total: number }> = {};
      demoData.orders.rows.forEach(order => {
        const status = order.status as string;
        if (!statusGroups[status]) {
          statusGroups[status] = { count: 0, total: 0 };
        }
        statusGroups[status].count++;
        statusGroups[status].total += order.total as number;
      });
      const rows = Object.entries(statusGroups).map(([status, data]) => ({
        status,
        order_count: data.count,
        total_amount: data.total,
        avg_amount: Math.round(data.total / data.count * 100) / 100,
      }));
      return {
        columns: ['status', 'order_count', 'total_amount', 'avg_amount'],
        rows,
      };
    }

    // Products by category
    if (sqlLower.includes('products') && sqlLower.includes('category')) {
      const categoryGroups: Record<string, { count: number; totalPrice: number; totalStock: number }> = {};
      demoData.products.rows.forEach(product => {
        const category = product.category as string;
        if (!categoryGroups[category]) {
          categoryGroups[category] = { count: 0, totalPrice: 0, totalStock: 0 };
        }
        categoryGroups[category].count++;
        categoryGroups[category].totalPrice += product.price as number;
        categoryGroups[category].totalStock += product.stock as number;
      });
      const rows = Object.entries(categoryGroups).map(([category, data]) => ({
        category,
        product_count: data.count,
        total_stock: data.totalStock,
        avg_price: Math.round(data.totalPrice / data.count * 100) / 100,
      }));
      return {
        columns: ['category', 'product_count', 'total_stock', 'avg_price'],
        rows,
      };
    }
  }

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
          columns: ['total'],
          rows: [{ total }],
        };
      }

      // Handle AVG queries
      if (sqlLower.includes('avg(')) {
        if (table === 'orders') {
          const avg = demoData.orders.rows.reduce((sum, row) => sum + (row.total as number), 0) / demoData.orders.rows.length;
          return {
            columns: ['average'],
            rows: [{ average: Math.round(avg * 100) / 100 }],
          };
        }
        if (table === 'products') {
          const avg = demoData.products.rows.reduce((sum, row) => sum + (row.price as number), 0) / demoData.products.rows.length;
          return {
            columns: ['average'],
            rows: [{ average: Math.round(avg * 100) / 100 }],
          };
        }
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
    let finalSQL = sql;
    let retryCount = 0;
    let wasRetried = false;

    if (isDemo) {
      // Demo mode: use fake data
      const result = executeDemoQuery(sql);
      rows = result.rows;
      columns = result.columns;
    } else {
      // Real database: execute query with retry logic
      // Use DATABASE_URL from env if connectionString is 'env'
      const connStr = connectionString === 'env' ? process.env.DATABASE_URL! : connectionString;
      const adapter = createAdapter(dbType as DatabaseType, connStr);

      try {
        await adapter.connect();

        // Try to execute, with retry on failure
        let lastError: Error | null = null;

        while (retryCount <= MAX_RETRY_ATTEMPTS) {
          try {
            const result = await adapter.executeQuery(finalSQL, 10000);
            rows = result.rows;
            columns = result.columns;
            lastError = null;
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (retryCount < MAX_RETRY_ATTEMPTS) {
              // Try to fix the query
              console.log(`Query failed (attempt ${retryCount + 1}), trying to fix: ${lastError.message}`);

              let fixedSQL = await fixSQL(
                question,
                finalSQL,
                lastError.message,
                schemaForAI,
                dbType as DatabaseType
              );

              // Deanonymize if needed
              if (anonymizeMode && anonymizationMap) {
                fixedSQL = deanonymizeSQL(fixedSQL, anonymizationMap);
              }

              // Validate fixed SQL
              const fixValidation = validateSQL(fixedSQL, readOnlyMode);
              if (fixValidation.valid) {
                finalSQL = ensureLimit(fixedSQL, 100);
                wasRetried = true;
              }
            }
            retryCount++;
          }
        }

        await adapter.disconnect();

        // If all retries failed, throw the last error
        if (lastError) {
          throw lastError;
        }
      } catch (error) {
        await adapter.disconnect().catch(() => {});
        throw error;
      }
    }

    // Generate summary (skip in privacy mode)
    const summary = privacyMode ? null : await generateSummary(question, finalSQL, rows!, columns!, locale);

    return NextResponse.json({
      success: true,
      sql: finalSQL,
      results: rows!,
      columns: columns!,
      summary,
      isDemo,
      wasRetried,
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
