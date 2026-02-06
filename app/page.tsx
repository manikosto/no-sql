'use client';

import { useState, useEffect } from 'react';
import { ConnectionForm } from '@/components/connection-form';
import { QueryInput } from '@/components/query-input';
import { SQLPreview } from '@/components/sql-preview';
import { ResultsTable } from '@/components/results-table';
import { ExportButton } from '@/components/export-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { QueryHistoryPanel } from '@/components/query-history-panel';
import { QuerySkeleton } from '@/components/loading-skeletons';
import { ErrorBoundary } from '@/components/error-boundary';
import { useLocale } from '@/lib/locale-context';
import { DatabaseSchema, QueryResult } from '@/lib/types';
import { DatabaseType } from '@/lib/db-adapter';
import { queryHistory } from '@/lib/query-history';
import { queryCache } from '@/lib/query-cache';
import { Database, Link, MessageSquare, BarChart3, Plug, Sparkles, ShieldCheck, ShieldOff, Heart, Github, FlaskConical, EyeOff, Eye, FileText, Server, Fingerprint, BookOpen, History, Clock, Zap } from 'lucide-react';
import NextLink from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Home() {
  const { t, locale } = useLocale();
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [dbType, setDbType] = useState<DatabaseType | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnlyMode, setReadOnlyMode] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [anonymizeMode, setAnonymizeMode] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [isLocalLLM, setIsLocalLLM] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // Check if using local LLM
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setIsLocalLLM(data.isLocalLLM))
      .catch(() => { });
  }, []);

  // Generate preview of what gets sent to AI
  const getPromptPreview = () => {
    if (!schema) return '';

    const schemaToShow = anonymizeMode
      ? schema.tables.map((table, ti) => ({
        name: `table_${ti + 1}`,
        columns: table.columns.map((col, ci) => ({
          name: `col_${ci + 1}`,
          type: col.type,
        })),
      }))
      : schema.tables;

    const schemaDescription = schemaToShow
      .map((table) => {
        const columns = table.columns
          .map((col) => `  - ${col.name} (${col.type})`)
          .join('\n');
        return `Table: ${table.name}\nColumns:\n${columns}`;
      })
      .join('\n\n');
    return schemaDescription;
  };

  const handleConnect = (connStr: string, dbSchema: DatabaseSchema, readOnly: boolean, type: DatabaseType) => {
    setConnectionString(connStr);
    setSchema(dbSchema);
    setDbType(type);
    setIsReadOnly(readOnly);
    setQueryResult(null);
    setError(null);
  };

  const handleQuery = async (question: string) => {
    if (!connectionString || !schema || !dbType) return;

    setLoading(true);
    setError(null);
    setFromCache(false);
    const startTime = Date.now();

    // Check cache first
    const cached = queryCache.get(
      connectionString,
      question,
      JSON.stringify(schema),
      readOnlyMode
    );

    if (cached) {
      // Use cached result
      setQueryResult({
        sql: cached.sql,
        results: cached.results,
        columns: cached.columns,
        summary: cached.summary,
      });
      setExecutionTime(Date.now() - startTime);
      setFromCache(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, question, schema, dbType, readOnlyMode, locale, privacyMode, anonymizeMode }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Query failed');
        return;
      }

      const execTime = Date.now() - startTime;
      setExecutionTime(execTime);

      const result = {
        sql: data.sql,
        results: data.results,
        columns: data.columns,
        summary: data.summary,
      };

      setQueryResult(result);

      // Save to cache
      queryCache.set(
        connectionString,
        question,
        JSON.stringify(schema),
        readOnlyMode,
        result
      );

      // Save to history
      queryHistory.addQuery(
        question,
        data.sql,
        data.results.length,
        execTime
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromHistory = (question: string) => {
    handleQuery(question);
    setShowHistory(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + H: Toggle history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowHistory(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold">HumanQL</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-sm"
              title={locale === 'ru' ? 'История (Ctrl+H)' : 'History (Ctrl+H)'}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">{locale === 'ru' ? 'История' : 'History'}</span>
            </button>
            <NextLink
              href="/guide"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{locale === 'ru' ? 'Гайд' : 'Guide'}</span>
            </NextLink>
            <a
              href="https://github.com/manikosto/no-sql"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://app.lava.top/aqa-proka4?tabId=donate"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors text-sm"
            >
              <Heart className="w-4 h-4" />
              {locale === 'ru' ? 'Поддержать' : 'Donate'}
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/50 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {dbType ? dbType.toUpperCase() : 'PostgreSQL • MySQL'}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-sm text-muted-foreground">
              {locale === 'ru' ? 'Только SELECT' : 'SELECT only'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="gradient-text">
              {locale === 'ru' ? 'SQL без SQL.' : 'SQL without SQL.'}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            {locale === 'ru'
              ? 'Подключи базу данных, задай вопрос на обычном языке. AI сгенерирует запрос и покажет данные.'
              : 'Connect your database, ask questions in plain language. AI generates queries and shows your data.'}
          </p>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70 max-w-xl mx-auto mb-4">
            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
            <span>
              {locale === 'ru'
                ? 'Мы проверяем уровень доступа и разрешаем только SELECT-запросы. Ваши данные в безопасности.'
                : 'We verify access level and only allow SELECT queries. Your data is safe.'}
            </span>
          </div>

          {/* Disclaimer / Self-hosted badge */}
          {isLocalLLM ? (
            <div className="flex items-center justify-center gap-2 text-sm text-green-500 max-w-xl mx-auto mb-12">
              <Server className="w-4 h-4 shrink-0" />
              <span>
                {locale === 'ru'
                  ? 'Локальный режим — данные не покидают ваш сервер'
                  : 'Self-hosted mode — data never leaves your server'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/50 max-w-xl mx-auto mb-12">
              <FlaskConical className="w-4 h-4 text-yellow-500/70 shrink-0" />
              <span>
                {locale === 'ru'
                  ? 'Данные идут в OpenAI. Для приватности — разверните локально с Ollama.'
                  : 'Data goes to OpenAI. For privacy — self-host with Ollama.'}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* App Interface */}
      <section className="px-6 pb-24">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border/50 bg-card p-1 glow">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">humanql.app</span>
            </div>

            {/* App Content */}
            <div className="p-6 space-y-6">
              {/* Connection */}
              <ErrorBoundary>
                <ConnectionForm
                  onConnect={handleConnect}
                  isConnected={!!connectionString}
                  schema={schema}
                  isReadOnly={isReadOnly}
                />
              </ErrorBoundary>

              {/* Query Input */}
              <ErrorBoundary>
                <QueryInput
                  onSubmit={handleQuery}
                  loading={loading}
                  disabled={!connectionString}
                />
              </ErrorBoundary>

              {/* Security settings - compact row */}
              {connectionString && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/30">
                  <span className="text-xs text-muted-foreground">
                    {locale === 'ru' ? 'Настройки' : 'Settings'}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Read-only toggle */}
                    {readOnlyMode ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-2 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors"
                            title={locale === 'ru' ? 'Только чтение (вкл)' : 'Read-only (on)'}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <ShieldOff className="w-5 h-5 text-yellow-500" />
                              {locale === 'ru' ? 'Отключить защиту?' : 'Disable protection?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              {locale === 'ru'
                                ? 'Вы сможете выполнять INSERT, UPDATE и DELETE. Все риски несёте вы.'
                                : 'You will be able to execute INSERT, UPDATE and DELETE. You assume all risks.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-secondary hover:bg-secondary/80">
                              {locale === 'ru' ? 'Отмена' : 'Cancel'}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => setReadOnlyMode(false)}
                              className="bg-yellow-500 text-black hover:bg-yellow-600"
                            >
                              {locale === 'ru' ? 'Отключить' : 'Disable'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <button
                        onClick={() => setReadOnlyMode(true)}
                        className="p-2 rounded-lg text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                        title={locale === 'ru' ? 'Режим записи (опасно!)' : 'Write mode (dangerous!)'}
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    )}

                    {/* Privacy toggle */}
                    <button
                      onClick={() => setPrivacyMode(!privacyMode)}
                      className={`p-2 rounded-lg transition-colors ${privacyMode ? 'text-green-500 hover:bg-green-500/10' : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      title={privacyMode
                        ? (locale === 'ru' ? 'Приватность (вкл) — данные не уходят' : 'Privacy (on) — no data sent')
                        : (locale === 'ru' ? 'Приватность (выкл)' : 'Privacy (off)')}
                    >
                      {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {/* Anonymize toggle */}
                    <button
                      onClick={() => setAnonymizeMode(!anonymizeMode)}
                      className={`p-2 rounded-lg transition-colors ${anonymizeMode ? 'text-green-500 hover:bg-green-500/10' : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      title={anonymizeMode
                        ? (locale === 'ru' ? 'Анонимизация (вкл) — users→table_1' : 'Anonymize (on) — users→table_1')
                        : (locale === 'ru' ? 'Анонимизация (выкл)' : 'Anonymize (off)')}
                    >
                      <Fingerprint className="w-4 h-4" />
                    </button>

                    {/* Show prompt preview */}
                    <AlertDialog open={showPromptPreview} onOpenChange={setShowPromptPreview}>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title={locale === 'ru' ? 'Что уходит в AI' : 'What is sent to AI'}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {locale === 'ru' ? 'Что отправляется в AI' : 'What is sent to AI'}
                          </AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="flex-1 overflow-auto">
                          <div className="space-y-4">
                            <pre className="p-3 rounded-lg bg-secondary/50 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
                              {getPromptPreview()}
                            </pre>
                            <div className="flex gap-2 flex-wrap">
                              {privacyMode && (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">
                                  {locale === 'ru' ? '✓ Данные не отправляются' : '✓ No data sent'}
                                </span>
                              )}
                              {anonymizeMode && (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">
                                  {locale === 'ru' ? '✓ Схема анонимизирована' : '✓ Schema anonymized'}
                                </span>
                              )}
                              {!privacyMode && (
                                <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500">
                                  {locale === 'ru' ? '⚠ 5 строк для саммари' : '⚠ 5 rows for summary'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-secondary hover:bg-secondary/80">
                            {locale === 'ru' ? 'Закрыть' : 'Close'}
                          </AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Loading skeleton */}
              {loading && <QuerySkeleton />}

              {/* Results */}
              {queryResult && !loading && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {queryResult.summary && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-sm">{queryResult.summary}</p>
                    </div>
                  )}

                  <SQLPreview sql={queryResult.sql} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{queryResult.results.length} {t('rows')}</span>
                      {executionTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {executionTime}ms
                        </span>
                      )}
                      {fromCache && (
                        <span className="flex items-center gap-1 text-green-500">
                          <Zap className="w-3.5 h-3.5" />
                          {locale === 'ru' ? 'Из кэша' : 'Cached'}
                        </span>
                      )}
                    </div>
                    <ExportButton
                      data={queryResult.results}
                      columns={queryResult.columns}
                    />
                  </div>

                  <ResultsTable
                    data={queryResult.results}
                    columns={queryResult.columns}
                  />
                </div>
              )}

              {/* Empty States */}
              {!connectionString && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Plug className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-muted-foreground">
                    {locale === 'ru'
                      ? 'Вставьте connection string выше'
                      : 'Paste your connection string above'}
                  </p>
                </div>
              )}

              {connectionString && !queryResult && !loading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {locale === 'ru'
                      ? 'Задайте вопрос о ваших данных'
                      : 'Ask a question about your data'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(locale === 'ru'
                      ? ['Покажи всех пользователей', 'Сколько записей?', 'Топ 10 по дате']
                      : ['Show all users', 'Count all records', 'Top 10 by date']
                    ).map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQuery(q)}
                        className="text-sm px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 border-t border-border/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-4 tracking-wide text-sm uppercase">
              {locale === 'ru' ? 'Как это работает' : 'How it works'}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {locale === 'ru' ? 'Три простых шага' : 'Three simple steps'}
            </h2>
            <p className="text-muted-foreground">
              {locale === 'ru'
                ? 'Никаких сложных настроек. Просто начните.'
                : 'No complicated setup. Just get started.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                icon: Link,
                title: locale === 'ru' ? 'Подключитесь' : 'Connect',
                desc: locale === 'ru'
                  ? 'Вставьте connection string вашей базы. Рекомендуем read-only пользователя.'
                  : 'Paste your database connection string. We recommend a read-only user.',
              },
              {
                step: 2,
                icon: MessageSquare,
                title: locale === 'ru' ? 'Спросите' : 'Ask',
                desc: locale === 'ru'
                  ? 'Напишите вопрос на обычном языке. "Покажи всех пользователей из Москвы"'
                  : 'Write your question in plain language. "Show all users from New York"',
              },
              {
                step: 3,
                icon: BarChart3,
                title: locale === 'ru' ? 'Получите данные' : 'Get data',
                desc: locale === 'ru'
                  ? 'AI сгенерирует SQL, выполнит его и покажет результаты в таблице.'
                  : 'AI generates SQL, executes it, and displays results in a table.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border border-border/50 bg-card/30 card-glow"
              >
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border/50">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Database className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">HumanQL</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Powered by GPT-4o • {locale === 'ru' ? 'Ваши данные не сохраняются' : 'Your data is not stored'}
          </p>
        </div>
      </footer>

      {/* Query History Panel */}
      <QueryHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectQuery={handleSelectFromHistory}
      />
    </div>
  );
}
