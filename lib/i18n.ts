export type Locale = 'en' | 'ru';

export const translations = {
  en: {
    title: 'No-SQL',
    connectionPlaceholder: 'postgresql://user:password@host:5432/database',
    connect: 'Connect',
    connecting: 'Connecting...',
    connected: 'Connected',
    tables: 'tables',
    showTables: 'Tables',
    hideTables: 'Hide',
    readOnly: 'read-only',
    writeWarning: 'Warning! Connection has write access. Use a read-only user for safety.',
    askPlaceholder: 'Ask a question about your data...',
    connectFirst: 'Connect to database first...',
    ask: 'Ask',
    sql: 'SQL',
    copy: 'Copy',
    copied: 'Copied',
    csv: 'CSV',
    rows: 'rows',
    noResults: 'No results',
    error: 'Error',
  },
  ru: {
    title: 'No-SQL',
    connectionPlaceholder: 'postgresql://user:password@host:5432/database',
    connect: 'Подключить',
    connecting: 'Подключение...',
    connected: 'Подключено',
    tables: 'таблиц',
    showTables: 'Таблицы',
    hideTables: 'Скрыть',
    readOnly: 'только чтение',
    writeWarning: 'Внимание! Подключение имеет права на запись. Используйте read-only пользователя для безопасности.',
    askPlaceholder: 'Задайте вопрос о ваших данных...',
    connectFirst: 'Сначала подключитесь к базе...',
    ask: 'Спросить',
    sql: 'SQL',
    copy: 'Копировать',
    copied: 'Скопировано',
    csv: 'CSV',
    rows: 'строк',
    noResults: 'Нет результатов',
    error: 'Ошибка',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}
