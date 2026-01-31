'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';

interface QueryInputProps {
  onSubmit: (question: string) => void;
  loading: boolean;
  disabled: boolean;
}

export function QueryInput({ onSubmit, loading, disabled }: QueryInputProps) {
  const { t } = useLocale();
  const [question, setQuestion] = useState('');

  const handleSubmit = () => {
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
  };

  return (
    <div className="flex gap-3">
      <input
        type="text"
        placeholder={disabled ? t('connectFirst') : t('askPlaceholder')}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
        disabled={disabled}
        className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <Button
        onClick={handleSubmit}
        disabled={loading || disabled || !question.trim()}
        className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </span>
        ) : (
          t('ask')
        )}
      </Button>
    </div>
  );
}
