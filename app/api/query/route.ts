import { NextRequest, NextResponse } from 'next/server';
import { createAdapter, DatabaseType } from '@/lib/db-adapter';
import { generateSQL, generateSummary } from '@/lib/ai';
import { validateSQL, ensureLimit } from '@/lib/security';
import { DatabaseSchema } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, question, schema, dbType, readOnlyMode = true } = await request.json();

    if (!connectionString || !question || !schema || !dbType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate SQL using AI
    let sql = await generateSQL(question, schema as DatabaseSchema, dbType as DatabaseType, readOnlyMode);

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

    // Execute query
    const adapter = createAdapter(dbType as DatabaseType, connectionString);

    try {
      await adapter.connect();
      const { rows, columns } = await adapter.executeQuery(sql, 10000);
      await adapter.disconnect();

      // Generate summary
      const summary = await generateSummary(question, sql, rows, columns);

      return NextResponse.json({
        success: true,
        sql,
        results: rows,
        columns,
        summary,
      });
    } catch (error) {
      await adapter.disconnect().catch(() => {});
      throw error;
    }
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
