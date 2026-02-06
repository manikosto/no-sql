'use client';

import { useState, useEffect } from 'react';
import { QueryHistoryItem, queryHistory } from '@/lib/query-history';
import { useLocale } from '@/lib/locale-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    History,
    Star,
    Trash2,
    Search,
    X,
    Clock,
    Database,
    Download,
    Upload,
} from 'lucide-react';

interface QueryHistoryPanelProps {
    onSelectQuery: (question: string, sql: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function QueryHistoryPanel({ onSelectQuery, isOpen, onClose }: QueryHistoryPanelProps) {
    const { locale } = useLocale();
    const [history, setHistory] = useState<QueryHistoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

    const loadHistory = () => {
        setHistory(queryHistory.getHistory());
    };

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHistory(queryHistory.getHistory());
        }
    }, [isOpen]);

    const handleToggleFavorite = (id: string) => {
        queryHistory.toggleFavorite(id);
        loadHistory();
    };

    const handleDelete = (id: string) => {
        queryHistory.deleteQuery(id);
        loadHistory();
    };

    const handleClearAll = () => {
        if (confirm(locale === 'ru' ? 'Очистить всю историю?' : 'Clear all history?')) {
            queryHistory.clearHistory(true);
            loadHistory();
        }
    };

    const handleExport = () => {
        const json = queryHistory.exportHistory();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `humanql-history-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const json = event.target?.result as string;
                    if (queryHistory.importHistory(json)) {
                        loadHistory();
                        alert(locale === 'ru' ? 'История импортирована' : 'History imported');
                    } else {
                        alert(locale === 'ru' ? 'Ошибка импорта' : 'Import failed');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const filteredHistory = searchQuery
        ? queryHistory.searchHistory(searchQuery)
        : activeTab === 'favorites'
            ? queryHistory.getFavorites()
            : history;

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return locale === 'ru' ? 'только что' : 'just now';
        if (diffMins < 60) return locale === 'ru' ? `${diffMins} мин назад` : `${diffMins}m ago`;
        if (diffHours < 24) return locale === 'ru' ? `${diffHours} ч назад` : `${diffHours}h ago`;
        if (diffDays < 7) return locale === 'ru' ? `${diffDays} д назад` : `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l border-border/50 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold">
                            {locale === 'ru' ? 'История запросов' : 'Query History'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={locale === 'ru' ? 'Поиск...' : 'Search...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-secondary/50 border-0"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === 'all'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                            }`}
                    >
                        {locale === 'ru' ? 'Все' : 'All'} ({history.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === 'favorites'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                            }`}
                    >
                        <Star className="w-3.5 h-3.5 inline mr-1" />
                        {locale === 'ru' ? 'Избранное' : 'Favorites'} ({queryHistory.getFavorites().length})
                    </button>
                </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">
                            {activeTab === 'favorites'
                                ? locale === 'ru'
                                    ? 'Нет избранных запросов'
                                    : 'No favorite queries'
                                : locale === 'ru'
                                    ? 'История пуста'
                                    : 'No history yet'}
                        </p>
                    </div>
                ) : (
                    filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            className="group p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors cursor-pointer"
                            onClick={() => onSelectQuery(item.question, item.sql)}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm font-medium flex-1 line-clamp-2">{item.question}</p>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFavorite(item.id);
                                        }}
                                        className="p-1 hover:bg-background rounded transition-colors"
                                    >
                                        <Star
                                            className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                                                }`}
                                        />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item.id);
                                        }}
                                        className="p-1 hover:bg-background rounded transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                </div>
                            </div>

                            <code className="text-xs text-muted-foreground font-mono block mb-2 line-clamp-1">
                                {item.sql}
                            </code>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(item.timestamp)}
                                </span>
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    {item.resultCount} {locale === 'ru' ? 'строк' : 'rows'}
                                </Badge>
                                {item.executionTime && (
                                    <span>{item.executionTime}ms</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 space-y-2">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="flex-1 h-8 text-xs"
                    >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        {locale === 'ru' ? 'Экспорт' : 'Export'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleImport}
                        className="flex-1 h-8 text-xs"
                    >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        {locale === 'ru' ? 'Импорт' : 'Import'}
                    </Button>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="w-full h-8 text-xs text-red-400 hover:text-red-300"
                >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {locale === 'ru' ? 'Очистить историю' : 'Clear History'}
                </Button>
            </div>
        </div>
    );
}
