'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLocale } from '@/lib/locale-context';
import { DatabaseSchema } from '@/lib/types';
import { DatabaseType } from '@/lib/db-adapter';
import { Info, Lock, Server, Brain, Play } from 'lucide-react';

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
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTables, setShowTables] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [hasEnvConnection, setHasEnvConnection] = useState(false);

  // Check if DATABASE_URL is set in env
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setHasEnvConnection(data.hasEnvConnection || false))
      .catch(() => { });
  }, []);

  const handleConnect = async (connStr?: string) => {
    const cs = connStr || connectionString;
    if (!cs.trim() && !hasEnvConnection) {
      setError(locale === 'ru' ? 'Введите connection string' : 'Enter connection string');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: cs || undefined, useEnv: !cs && hasEnvConnection }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to connect');
        return;
      }

      onConnect(cs || 'env', data.schema, data.isReadOnly, data.dbType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Demo failed');
        return;
      }

      onConnect('demo', data.schema, true, 'postgresql');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo failed');
    } finally {
      setDemoLoading(false);
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
        <div className="relative flex-1">
          <Input
            type="password"
            placeholder={hasEnvConnection
              ? (locale === 'ru' ? 'Используется DATABASE_URL из env' : 'Using DATABASE_URL from env')
              : t('connectionPlaceholder')}
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            disabled={hasEnvConnection && !connectionString}
            className="font-mono text-sm h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-primary pr-10"
          />
          <AlertDialog open={showSecurityInfo} onOpenChange={setShowSecurityInfo}>
            <AlertDialogTrigger asChild>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                <Info className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-500" />
                  {locale === 'ru' ? 'Безопасность подключения' : 'Connection Security'}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      {locale === 'ru'
                        ? 'Ваша строка подключения в безопасности:'
                        : 'Your connection string is secure:'}
                    </p>

                    {/* Data flow diagram */}
                    <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                      <div className="flex items-center gap-3 text-green-500">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>{locale === 'ru' ? 'Хранится только в браузере' : 'Stored only in browser'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-green-500">
                        <Server className="w-4 h-4 shrink-0" />
                        <span>{locale === 'ru' ? 'Сервер использует для запроса и забывает' : 'Server uses for query and forgets'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-green-500">
                        <Brain className="w-4 h-4 shrink-0" />
                        <span>{locale === 'ru' ? 'НЕ отправляется в AI (OpenAI/Ollama)' : 'NOT sent to AI (OpenAI/Ollama)'}</span>
                      </div>
                    </div>

                    {/* Flow diagram */}
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                        {locale === 'ru' ? 'Поток данных' : 'Data Flow'}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-primary/20 text-primary">
                          {locale === 'ru' ? 'Браузер' : 'Browser'}
                        </span>
                        <span>→</span>
                        <span className="px-2 py-1 rounded bg-secondary">
                          {locale === 'ru' ? 'Сервер' : 'Server'}
                        </span>
                        <span>→</span>
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-500">
                          {locale === 'ru' ? 'Ваша БД' : 'Your DB'}
                        </span>
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        {locale === 'ru' ? 'В AI идёт только схема (названия таблиц)' : 'Only schema (table names) goes to AI'}
                      </p>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-secondary hover:bg-secondary/80">
                  {locale === 'ru' ? 'Понятно' : 'Got it'}
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Button
          onClick={() => handleConnect()}
          disabled={loading}
          className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90"
        >
          {loading ? '...' : t('connect')}
        </Button>
      </div>

      {/* Security hint */}
      <p className="text-xs text-muted-foreground/60 px-1 flex items-center gap-1">
        <Lock className="w-3 h-3" />
        {locale === 'ru'
          ? 'Строка не сохраняется и не отправляется в AI'
          : 'String is not stored and not sent to AI'}
      </p>

      {/* Demo button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          {demoLoading
            ? '...'
            : (locale === 'ru' ? 'Попробовать демо без своей БД' : 'Try demo without your DB')}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 px-1">{error}</p>
      )}
    </div>
  );
}
