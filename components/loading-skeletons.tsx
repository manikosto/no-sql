'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-32" />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
                {/* Table header */}
                <div className="bg-secondary/30 px-4 py-3 flex gap-4">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                </div>

                {/* Table rows */}
                <div className="divide-y divide-border/50">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="px-4 py-3 flex gap-4">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-16" />
                </div>
            </div>
        </div>
    );
}

export function ConnectionSkeleton() {
    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <Skeleton className="flex-1 h-12 rounded-xl" />
                <Skeleton className="h-12 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-4 w-64" />
        </div>
    );
}

export function QuerySkeleton() {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </div>

            {/* SQL Preview */}
            <div className="p-4 rounded-xl bg-secondary/30 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
            </div>

            {/* Results */}
            <TableSkeleton />
        </div>
    );
}
