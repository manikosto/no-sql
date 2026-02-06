export interface QueryHistoryItem {
    id: string;
    question: string;
    sql: string;
    timestamp: number;
    resultCount: number;
    executionTime?: number;
    isFavorite: boolean;
}

const STORAGE_KEY = 'humanql_query_history';
const MAX_HISTORY_ITEMS = 50;

export class QueryHistoryManager {
    private static instance: QueryHistoryManager;

    private constructor() { }

    static getInstance(): QueryHistoryManager {
        if (!QueryHistoryManager.instance) {
            QueryHistoryManager.instance = new QueryHistoryManager();
        }
        return QueryHistoryManager.instance;
    }

    // Get all history items
    getHistory(): QueryHistoryItem[] {
        if (typeof window === 'undefined') return [];

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];

            const items = JSON.parse(stored) as QueryHistoryItem[];
            return items.sort((a, b) => b.timestamp - a.timestamp);
        } catch {
            return [];
        }
    }

    // Add a new query to history
    addQuery(
        question: string,
        sql: string,
        resultCount: number,
        executionTime?: number
    ): QueryHistoryItem {
        const item: QueryHistoryItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            question,
            sql,
            timestamp: Date.now(),
            resultCount,
            executionTime,
            isFavorite: false,
        };

        const history = this.getHistory();

        // Check if this exact query already exists (don't duplicate)
        const existingIndex = history.findIndex(
            h => h.question === question && h.sql === sql
        );

        if (existingIndex !== -1) {
            // Update existing entry with new timestamp
            history[existingIndex] = { ...item, isFavorite: history[existingIndex].isFavorite };
            history.splice(existingIndex, 1);
            history.unshift(history[existingIndex]);
        } else {
            // Add new entry
            history.unshift(item);
        }

        // Keep only the last MAX_HISTORY_ITEMS
        const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

        this.saveHistory(trimmed);
        return item;
    }

    // Toggle favorite status
    toggleFavorite(id: string): void {
        const history = this.getHistory();
        const item = history.find(h => h.id === id);

        if (item) {
            item.isFavorite = !item.isFavorite;
            this.saveHistory(history);
        }
    }

    // Get only favorites
    getFavorites(): QueryHistoryItem[] {
        return this.getHistory().filter(item => item.isFavorite);
    }

    // Delete a specific query
    deleteQuery(id: string): void {
        const history = this.getHistory().filter(h => h.id !== id);
        this.saveHistory(history);
    }

    // Clear all history (except favorites)
    clearHistory(keepFavorites: boolean = true): void {
        if (keepFavorites) {
            const favorites = this.getFavorites();
            this.saveHistory(favorites);
        } else {
            this.saveHistory([]);
        }
    }

    // Search history
    searchHistory(query: string): QueryHistoryItem[] {
        const lowerQuery = query.toLowerCase();
        return this.getHistory().filter(
            item =>
                item.question.toLowerCase().includes(lowerQuery) ||
                item.sql.toLowerCase().includes(lowerQuery)
        );
    }

    // Export history as JSON
    exportHistory(): string {
        return JSON.stringify(this.getHistory(), null, 2);
    }

    // Import history from JSON
    importHistory(jsonString: string): boolean {
        try {
            const items = JSON.parse(jsonString) as QueryHistoryItem[];

            // Validate structure
            if (!Array.isArray(items)) return false;

            const valid = items.every(
                item =>
                    typeof item.id === 'string' &&
                    typeof item.question === 'string' &&
                    typeof item.sql === 'string' &&
                    typeof item.timestamp === 'number'
            );

            if (!valid) return false;

            this.saveHistory(items);
            return true;
        } catch {
            return false;
        }
    }

    private saveHistory(items: QueryHistoryItem[]): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Failed to save query history:', error);
        }
    }
}

// Singleton instance
export const queryHistory = QueryHistoryManager.getInstance();
