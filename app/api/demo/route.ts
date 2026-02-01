import { NextResponse } from 'next/server';
import { DatabaseSchema } from '@/lib/types';

// Demo schema for users to try without their own database
const demoSchema: DatabaseSchema = {
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'email', type: 'varchar' },
        { name: 'name', type: 'varchar' },
        { name: 'created_at', type: 'timestamp' },
        { name: 'is_active', type: 'boolean' },
      ],
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'user_id', type: 'integer' },
        { name: 'total', type: 'decimal' },
        { name: 'status', type: 'varchar' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'varchar' },
        { name: 'price', type: 'decimal' },
        { name: 'category', type: 'varchar' },
        { name: 'stock', type: 'integer' },
      ],
    },
    {
      name: 'order_items',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'order_id', type: 'integer' },
        { name: 'product_id', type: 'integer' },
        { name: 'quantity', type: 'integer' },
        { name: 'price', type: 'decimal' },
      ],
    },
  ],
};

export async function GET() {
  return NextResponse.json({
    success: true,
    schema: demoSchema,
    isReadOnly: true,
    dbType: 'postgresql',
    isDemo: true,
  });
}
