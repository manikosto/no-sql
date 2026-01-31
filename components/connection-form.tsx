'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocale } from '@/lib/locale-context';
import { DatabaseSchema } from '@/lib/types';
import { DatabaseType } from '@/lib/db-adapter';

interface ConnectionFormProps {
  onConnect: (connectionString: string, schema: DatabaseSchema, isReadOnly: boolean, dbType: DatabaseType) => void;
  isConnected: boolean;
  schema: DatabaseSchema | null;
  isReadOnly: boolean | null;
}

export function ConnectionForm({ onConnect, isConnected, schema, isReadOnly }: ConnectionFormProps) {
  const { t, locale } = useLocale();
  const [connectionString, setConnectionString] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTables, setShowTables] = useState(false);

  const handleConnect = async () => {
    if (!connectionString.trim()) {
      setError(locale === 'ru' ? 'Введите connection string' : 'Enter connection string');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to connect');
        return;
      }

      onConnect(connectionString, data.schema, data.isReadOnly, data.dbType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (isConnected && schema) {
    return (
      <div className="space-y-3">
        {isReadOnly === false && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <strong>⚠️</strong> {t('writeWarning')}
          </div>
        )}
        <Collapsible open={showTables} onOpenChange={setShowTables}>
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isReadOnly ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-medium">{t('connected')}</span>
              <span className="text-muted-foreground">
                {schema.tables.length} {t('tables')}
              </span>
              {isReadOnly && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">
                  {t('readOnly')}
                </Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {showTables ? t('hideTables') : t('showTables')}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2 p-4 pt-3">
              {schema.tables.map((table) => (
                <Badge key={table.name} variant="secondary" className="font-mono text-xs">
                  {table.name}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Input
          type="password"
          placeholder={t('connectionPlaceholder')}
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          className="font-mono text-sm h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-primary"
        />
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90"
        >
          {loading ? '...' : t('connect')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-400 px-1">{error}</p>
      )}
    </div>
  );
}
