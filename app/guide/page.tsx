'use client';

import { useLocale } from '@/lib/locale-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  Database,
  ArrowLeft,
  Shield,
  Zap,
  Lock,
  Eye,
  Server,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Code,
  Table,
  Search,
  Filter,
  BarChart3,
  Users,
  Calendar,
  Hash
} from 'lucide-react';
import Link from 'next/link';

export default function GuidePage() {
  const { locale } = useLocale();

  const content = locale === 'ru' ? {
    title: 'Полный гайд по HumanQL',
    subtitle: 'Всё что нужно знать для эффективной работы',
    backToApp: 'Назад к приложению',

    sections: {
      quickStart: {
        title: 'Быстрый старт',
        steps: [
          {
            title: 'Получите connection string',
            desc: 'Строка подключения выглядит так:',
            code: 'postgresql://user:password@host:5432/database',
            tip: 'Найдите её в панели управления вашего хостинга (Supabase, Neon, Railway, etc.)'
          },
          {
            title: 'Подключитесь',
            desc: 'Вставьте строку и нажмите Connect. Мы получим схему вашей базы.',
          },
          {
            title: 'Задайте вопрос',
            desc: 'Напишите что хотите узнать обычным языком. AI сгенерирует SQL.',
          }
        ]
      },

      queryExamples: {
        title: 'Примеры запросов',
        subtitle: 'От простых к сложным',
        categories: [
          {
            icon: Table,
            title: 'Базовые',
            examples: [
              { q: 'Покажи всех пользователей', sql: 'SELECT * FROM users LIMIT 100' },
              { q: 'Сколько заказов?', sql: 'SELECT COUNT(*) FROM orders' },
              { q: 'Последние 10 продуктов', sql: 'SELECT * FROM products ORDER BY created_at DESC LIMIT 10' },
            ]
          },
          {
            icon: Filter,
            title: 'Фильтрация',
            examples: [
              { q: 'Активные пользователи', sql: 'SELECT * FROM users WHERE is_active = true' },
              { q: 'Заказы дороже 1000', sql: 'SELECT * FROM orders WHERE total > 1000' },
              { q: 'Пользователи с gmail', sql: "SELECT * FROM users WHERE email ILIKE '%@gmail.com'" },
            ]
          },
          {
            icon: Users,
            title: 'JOIN запросы',
            examples: [
              { q: 'Заказы с именами клиентов', sql: 'SELECT o.*, u.name FROM orders o JOIN users u ON o.user_id = u.id' },
              { q: 'Товары которые никто не заказал', sql: 'SELECT p.* FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id WHERE oi.id IS NULL' },
            ]
          },
          {
            icon: BarChart3,
            title: 'Агрегация',
            examples: [
              { q: 'Сумма продаж по месяцам', sql: "SELECT DATE_TRUNC('month', created_at) as month, SUM(total) FROM orders GROUP BY month" },
              { q: 'Средний чек по статусу', sql: 'SELECT status, AVG(total) FROM orders GROUP BY status' },
              { q: 'Топ 5 покупателей', sql: 'SELECT user_id, SUM(total) as spent FROM orders GROUP BY user_id ORDER BY spent DESC LIMIT 5' },
            ]
          },
          {
            icon: Calendar,
            title: 'Даты',
            examples: [
              { q: 'Заказы за последнюю неделю', sql: "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'" },
              { q: 'Регистрации в этом месяце', sql: "SELECT * FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)" },
            ]
          },
        ]
      },

      security: {
        title: 'Безопасность',
        features: [
          {
            icon: Shield,
            title: 'Read-only по умолчанию',
            desc: 'Разрешены только SELECT запросы. INSERT, UPDATE, DELETE заблокированы.',
          },
          {
            icon: Lock,
            title: 'Валидация SQL',
            desc: 'Каждый запрос проверяется перед выполнением. DROP, TRUNCATE, ALTER невозможны.',
          },
          {
            icon: Eye,
            title: 'Privacy Mode',
            desc: 'Включите чтобы данные не отправлялись в AI для генерации summary.',
          },
          {
            icon: Hash,
            title: 'Анонимизация схемы',
            desc: 'Включите чтобы AI видел table_1, col_1 вместо реальных названий.',
          },
          {
            icon: Server,
            title: 'Self-hosted режим',
            desc: 'Разверните с Ollama — данные никогда не покинут ваш сервер.',
          },
        ]
      },

      tips: {
        title: 'Советы',
        items: [
          {
            icon: Lightbulb,
            title: 'Будьте конкретны',
            desc: 'Вместо "покажи данные" пишите "покажи имена и email пользователей"',
          },
          {
            icon: Lightbulb,
            title: 'Используйте названия таблиц',
            desc: 'AI лучше понимает когда вы упоминаете реальные названия из схемы',
          },
          {
            icon: Lightbulb,
            title: 'Уточняйте лимиты',
            desc: '"Топ 10 по продажам" лучше чем просто "кто больше всего продал"',
          },
          {
            icon: Lightbulb,
            title: 'Указывайте период',
            desc: '"за последний месяц" или "в 2024 году" помогает AI написать правильный фильтр',
          },
        ]
      },

      connection: {
        title: 'Форматы подключения',
        formats: [
          {
            db: 'PostgreSQL',
            format: 'postgresql://user:password@host:5432/database',
            providers: ['Supabase', 'Neon', 'Railway', 'Render', 'Heroku']
          },
          {
            db: 'MySQL',
            format: 'mysql://user:password@host:3306/database',
            providers: ['PlanetScale', 'AWS RDS', 'DigitalOcean']
          }
        ],
        readOnlyTip: 'Рекомендуем создать read-only пользователя для максимальной безопасности.'
      },

      selfHosted: {
        title: 'Self-hosted режим',
        desc: 'Для максимальной приватности разверните всё локально:',
        steps: [
          'git clone https://github.com/manikosto/no-sql',
          'cd no-sql',
          'docker-compose up',
        ],
        note: 'Ollama скачает модель (~4GB) при первом запуске. После этого все запросы обрабатываются локально.'
      }
    }
  } : {
    title: 'Complete HumanQL Guide',
    subtitle: 'Everything you need to know for effective usage',
    backToApp: 'Back to app',

    sections: {
      quickStart: {
        title: 'Quick Start',
        steps: [
          {
            title: 'Get your connection string',
            desc: 'The connection string looks like this:',
            code: 'postgresql://user:password@host:5432/database',
            tip: 'Find it in your hosting dashboard (Supabase, Neon, Railway, etc.)'
          },
          {
            title: 'Connect',
            desc: 'Paste the string and click Connect. We\'ll fetch your database schema.',
          },
          {
            title: 'Ask a question',
            desc: 'Write what you want to know in plain language. AI will generate SQL.',
          }
        ]
      },

      queryExamples: {
        title: 'Query Examples',
        subtitle: 'From simple to complex',
        categories: [
          {
            icon: Table,
            title: 'Basic',
            examples: [
              { q: 'Show all users', sql: 'SELECT * FROM users LIMIT 100' },
              { q: 'How many orders?', sql: 'SELECT COUNT(*) FROM orders' },
              { q: 'Last 10 products', sql: 'SELECT * FROM products ORDER BY created_at DESC LIMIT 10' },
            ]
          },
          {
            icon: Filter,
            title: 'Filtering',
            examples: [
              { q: 'Active users', sql: 'SELECT * FROM users WHERE is_active = true' },
              { q: 'Orders over 1000', sql: 'SELECT * FROM orders WHERE total > 1000' },
              { q: 'Users with gmail', sql: "SELECT * FROM users WHERE email ILIKE '%@gmail.com'" },
            ]
          },
          {
            icon: Users,
            title: 'JOIN queries',
            examples: [
              { q: 'Orders with customer names', sql: 'SELECT o.*, u.name FROM orders o JOIN users u ON o.user_id = u.id' },
              { q: 'Products never ordered', sql: 'SELECT p.* FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id WHERE oi.id IS NULL' },
            ]
          },
          {
            icon: BarChart3,
            title: 'Aggregation',
            examples: [
              { q: 'Sales by month', sql: "SELECT DATE_TRUNC('month', created_at) as month, SUM(total) FROM orders GROUP BY month" },
              { q: 'Average order by status', sql: 'SELECT status, AVG(total) FROM orders GROUP BY status' },
              { q: 'Top 5 customers', sql: 'SELECT user_id, SUM(total) as spent FROM orders GROUP BY user_id ORDER BY spent DESC LIMIT 5' },
            ]
          },
          {
            icon: Calendar,
            title: 'Dates',
            examples: [
              { q: 'Orders from last week', sql: "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'" },
              { q: 'Registrations this month', sql: "SELECT * FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)" },
            ]
          },
        ]
      },

      security: {
        title: 'Security',
        features: [
          {
            icon: Shield,
            title: 'Read-only by default',
            desc: 'Only SELECT queries allowed. INSERT, UPDATE, DELETE are blocked.',
          },
          {
            icon: Lock,
            title: 'SQL validation',
            desc: 'Every query is validated before execution. DROP, TRUNCATE, ALTER are impossible.',
          },
          {
            icon: Eye,
            title: 'Privacy Mode',
            desc: 'Enable to prevent data from being sent to AI for summary generation.',
          },
          {
            icon: Hash,
            title: 'Schema anonymization',
            desc: 'Enable so AI sees table_1, col_1 instead of real names.',
          },
          {
            icon: Server,
            title: 'Self-hosted mode',
            desc: 'Deploy with Ollama — data never leaves your server.',
          },
        ]
      },

      tips: {
        title: 'Tips',
        items: [
          {
            icon: Lightbulb,
            title: 'Be specific',
            desc: 'Instead of "show data" write "show user names and emails"',
          },
          {
            icon: Lightbulb,
            title: 'Use table names',
            desc: 'AI works better when you mention actual names from the schema',
          },
          {
            icon: Lightbulb,
            title: 'Specify limits',
            desc: '"Top 10 by sales" is better than just "who sold the most"',
          },
          {
            icon: Lightbulb,
            title: 'Include time periods',
            desc: '"last month" or "in 2024" helps AI write the correct filter',
          },
        ]
      },

      connection: {
        title: 'Connection Formats',
        formats: [
          {
            db: 'PostgreSQL',
            format: 'postgresql://user:password@host:5432/database',
            providers: ['Supabase', 'Neon', 'Railway', 'Render', 'Heroku']
          },
          {
            db: 'MySQL',
            format: 'mysql://user:password@host:3306/database',
            providers: ['PlanetScale', 'AWS RDS', 'DigitalOcean']
          }
        ],
        readOnlyTip: 'We recommend creating a read-only user for maximum security.'
      },

      selfHosted: {
        title: 'Self-hosted Mode',
        desc: 'For maximum privacy, deploy everything locally:',
        steps: [
          'git clone https://github.com/manikosto/no-sql',
          'cd no-sql',
          'docker-compose up',
        ],
        note: 'Ollama will download the model (~4GB) on first run. After that, all queries are processed locally.'
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-6xl">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{content.backToApp}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold">HumanQL</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="gradient-text">{content.title}</span>
          </h1>
          <p className="text-xl text-muted-foreground">{content.subtitle}</p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="px-6 pb-16">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            {content.sections.quickStart.title}
          </h2>
          <div className="space-y-6">
            {content.sections.quickStart.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-muted-foreground mb-2">{step.desc}</p>
                  {step.code && (
                    <code className="block p-3 rounded-lg bg-secondary/50 text-sm font-mono mb-2 overflow-x-auto">
                      {step.code}
                    </code>
                  )}
                  {step.tip && (
                    <p className="text-sm text-muted-foreground/70 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                      {step.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Query Examples */}
      <section className="px-6 py-16 bg-card/30 border-y border-border/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            {content.sections.queryExamples.title}
          </h2>
          <p className="text-muted-foreground mb-8">{content.sections.queryExamples.subtitle}</p>

          <div className="space-y-8">
            {content.sections.queryExamples.categories.map((cat, i) => (
              <div key={i}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <cat.icon className="w-5 h-5 text-primary" />
                  {cat.title}
                </h3>
                <div className="space-y-3">
                  {cat.examples.map((ex, j) => (
                    <div key={j} className="p-4 rounded-xl bg-background border border-border/50">
                      <p className="font-medium mb-2">"{ex.q}"</p>
                      <code className="text-sm text-muted-foreground font-mono">{ex.sql}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="px-6 py-16">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            {content.sections.security.title}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {content.sections.security.features.map((feature, i) => (
              <div key={i} className="p-5 rounded-xl border border-border/50 bg-card/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="px-6 py-16 bg-card/30 border-y border-border/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" />
            {content.sections.tips.title}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {content.sections.tips.items.map((tip, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-background">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {tip.title}
                </h3>
                <p className="text-sm text-muted-foreground">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connection Formats */}
      <section className="px-6 py-16">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            {content.sections.connection.title}
          </h2>
          <div className="space-y-4">
            {content.sections.connection.formats.map((format, i) => (
              <div key={i} className="p-5 rounded-xl border border-border/50 bg-card/30">
                <h3 className="font-semibold mb-2">{format.db}</h3>
                <code className="block p-3 rounded-lg bg-secondary/50 text-sm font-mono mb-3 overflow-x-auto">
                  {format.format}
                </code>
                <div className="flex flex-wrap gap-2">
                  {format.providers.map((p, j) => (
                    <span key={j} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">{content.sections.connection.readOnlyTip}</p>
          </div>
        </div>
      </section>

      {/* Self-hosted */}
      <section className="px-6 py-16 bg-card/30 border-t border-border/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Server className="w-6 h-6 text-primary" />
            {content.sections.selfHosted.title}
          </h2>
          <p className="text-muted-foreground mb-6">{content.sections.selfHosted.desc}</p>
          <div className="p-5 rounded-xl bg-background border border-border/50">
            <div className="space-y-2 font-mono text-sm">
              {content.sections.selfHosted.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <code>{step}</code>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground flex items-start gap-2">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
            {content.sections.selfHosted.note}
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            {locale === 'ru' ? 'Готовы начать?' : 'Ready to start?'}
          </h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Database className="w-5 h-5" />
            {locale === 'ru' ? 'Открыть HumanQL' : 'Open HumanQL'}
          </Link>
        </div>
      </section>
    </div>
  );
}
