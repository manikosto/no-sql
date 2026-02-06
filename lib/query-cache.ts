export interface CachedQuery {
    sql: string;
    results: Record<string, unknown>[];
    columns: string[];
    summary: string | null;
    timestamp: number;
}

const CACHE_KEY = 'humanql_query_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 20;

export class QueryCache {
    private static instance: QueryCache;
    private cache: Map<string, CachedQuery> = new Map();

    private constructor() {
        this.loadFromStorage();
    }

    static getInstance(): QueryCache {
        if (!QueryCache.instance) {
            QueryCache.instance = new QueryCache();
        }
        return QueryCache.instance;
    }

    // Generate cache key from query parameters
    private getCacheKey(
        connectionString: string,
        question: string,
        schema: string,
        readOnlyMode: boolean
    ): string {
        return `${connectionString}:${question}:${JSON.stringify(schema)}:${readOnlyMode}`;
    }

    // Get cached result if valid
    get(
        connectionString: string,
        question: string,
        schema: string,
        readOnlyMode: boolean
    ): CachedQuery | null {
        const key = this.getCacheKey(connectionString, question, schema, readOnlyMode);
        const cached = this.cache.get(key);

        if (!cached) return null;

        // Check if cache is still valid
        const age = Date.now() - cached.timestamp;
        if (age > CACHE_TTL) {
            this.cache.delete(key);
            this.saveToStorage();
            return null;
        }

        return cached;
    }

    // Store query result in cache
    set(
        connectionString: string,
        question: string,
        schema: string,
        readOnlyMode: boolean,
        result: Omit<CachedQuery, 'timestamp'>
    ): void {
        const key = this.getCacheKey(connectionString, question, schema, readOnlyMode);

        this.cache.set(key, {
            ...result,
            timestamp: Date.now(),
        });

        // Enforce cache size limit (LRU)
        if (this.cache.size > MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value as string | undefined;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.saveToStorage();
    }

    // Clear all cache
    clear(): void {
        this.cache.clear();
        this.saveToStorage();
    }

    // Clear expired entries
    clearExpired(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > CACHE_TTL) {
                this.cache.delete(key);
            }
        }
        this.saveToStorage();
    }

    // Get cache stats
    getStats(): { size: number; maxSize: number; ttl: number } {
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
            ttl: CACHE_TTL,
        };
    }

    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(CACHE_KEY);
            if (!stored) return;

            const data = JSON.parse(stored) as Array<[string, CachedQuery]>;
            this.cache = new Map(data);

            // Clear expired on load
            this.clearExpired();
        } catch (error) {
            console.error('Failed to load query cache:', error);
            this.cache.clear();
        }
    }

    private saveToStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const data = Array.from(this.cache.entries());
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save query cache:', error);
        }
    }
}

export const queryCache = QueryCache.getInstance();
