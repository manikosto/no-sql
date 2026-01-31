'use client';

import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocale } from '@/lib/locale-context';

interface SQLPreviewProps {
  sql: string | null;
}

export function SQLPreview({ sql }: SQLPreviewProps) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sql) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-3 text-sm">
        <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          <span className="font-mono">{t('sql')}</span>
        </CollapsibleTrigger>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? '✓ ' + t('copied') : t('copy')}
        </button>
      </div>
      <CollapsibleContent>
        <pre className="mt-3 p-4 rounded-xl bg-secondary/30 text-sm font-mono overflow-x-auto">
          <code className="text-primary">{sql}</code>
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
