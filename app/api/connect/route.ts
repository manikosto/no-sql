import { NextRequest, NextResponse } from 'next/server';
import { createAdapter, detectDatabaseType, DatabaseType } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, dbType: providedDbType } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { success: false, error: 'Connection string is required' },
        { status: 400 }
      );
    }

    // Detect or use provided database type
    const dbType: DatabaseType | null = providedDbType || detectDatabaseType(connectionString);

    if (!dbType) {
      return NextResponse.json(
        { success: false, error: 'Could not detect database type. Use postgresql:// or mysql:// prefix.' },
        { status: 400 }
      );
    }

    const adapter = createAdapter(dbType, connectionString);

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
