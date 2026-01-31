'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/locale-context';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: string[];
}

export function ExportButton({ data, columns }: ExportButtonProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  if (data.length === 0) return null;

  const handleExport = async () => {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, columns }),
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const header = columns.join('\t');
    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        return String(value);
      }).join('\t')
    );
    const tsv = [header, ...rows].join('\n');

    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-3 text-xs text-muted-foreground">
      <button onClick={handleCopy} className="hover:text-foreground transition-colors">
        {copied ? t('copied') : t('copy')}
      </button>
      <button onClick={handleExport} className="hover:text-foreground transition-colors">
        {t('csv')}
      </button>
    </div>
  );
}
