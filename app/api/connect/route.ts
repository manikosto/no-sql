import { NextRequest, NextResponse } from 'next/server';
import { createAdapter, detectDatabaseType, DatabaseType } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, dbType: providedDbType, useEnv } = await request.json();

    // Use DATABASE_URL from env if useEnv is true
    const connStr = useEnv ? process.env.DATABASE_URL : connectionString;

    if (!connStr) {
      return NextResponse.json(
        { success: false, error: useEnv ? 'DATABASE_URL not configured' : 'Connection string is required' },
        { status: 400 }
      );
    }

    // Detect or use provided database type
    const dbType: DatabaseType | null = providedDbType || detectDatabaseType(connStr);

    if (!dbType) {
      return NextResponse.json(
        { success: false, error: 'Could not detect database type. Use postgresql:// or mysql:// prefix.' },
        { status: 400 }
      );
    }

    const adapter = createAdapter(dbType, connStr);

    try {
      await adapter.connect();

      const schema = await adapter.getSchema();
      const hasWriteAccess = await adapter.checkWriteAccess();

      await adapter.disconnect();

      return NextResponse.json({
        success: true,
        schema,
        isReadOnly: !hasWriteAccess,
        dbType,
      });
    } catch (error) {
      await adapter.disconnect().catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to database',
      },
      { status: 500 }
    );
  }
}
