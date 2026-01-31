import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { data, columns } = await request.json();

    if (!data || !Array.isArray(data) || !columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // Build CSV
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = columns.map(escapeCSV).join(',');
    const rows = data.map((row: Record<string, unknown>) =>
      columns.map((col: string) => escapeCSV(row[col])).join(',')
    );

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      },
      { status: 500 }
    );
  }
}
