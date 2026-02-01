import { NextResponse } from 'next/server';
import { DatabaseSchema } from '@/lib/types';

// Demo schema for users to try without their own database
const demoSchema: DatabaseSchema = {
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'integer', isPrimaryKey: true, nullable: false },
        { name: 'email', type: 'varchar', nullable: false },
        { name: 'name', type: 'varchar', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
        { name: 'is_active', type: 'boolean', nullable: false },
      ],
      primaryKey: ['id'],
      rowCount: 5,
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'integer', isPrimaryKey: true, nullable: false },
        { name: 'user_id', type: 'integer', nullable: false },
        { name: 'total', type: 'decimal', nullable: false },
        { name: 'status', type: 'varchar', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
      ],
      primaryKey: ['id'],
      foreignKeys: [
        { column: 'user_id', referencesTable: 'users', referencesColumn: 'id' },
      ],
      rowCount: 5,
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'integer', isPrimaryKey: true, nullable: false },
        { name: 'name', type: 'varchar', nullable: false },
        { name: 'price', type: 'decimal', nullable: false },
        { name: 'category', type: 'varchar', nullable: false },
        { name: 'stock', type: 'integer', nullable: false },
      ],
      primaryKey: ['id'],
      rowCount: 5,
    },
    {
      name: 'order_items',
      columns: [
        { name: 'id', type: 'integer', isPrimaryKey: true, nullable: false },
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'product_id', type: 'integer', nullable: false },
        { name: 'quantity', type: 'integer', nullable: false },
        { name: 'price', type: 'decimal', nullable: false },
      ],
      primaryKey: ['id'],
      foreignKeys: [
        { column: 'order_id', referencesTable: 'orders', referencesColumn: 'id' },
        { column: 'product_id', referencesTable: 'products', referencesColumn: 'id' },
      ],
      rowCount: 5,
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
