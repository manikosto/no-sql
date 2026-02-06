'use client';

import { useMemo, useState } from 'react';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, X } from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';

interface DataVisualizationProps {
    data: Record<string, unknown>[];
    columns: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function DataVisualization({ data, columns }: DataVisualizationProps) {
    const { locale } = useLocale();
    const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
    const [isOpen, setIsOpen] = useState(false);

    // Analyze data to find numeric columns
    const { numericColumns, chartData } = useMemo(() => {
        if (data.length === 0) return { numericColumns: [], chartData: [] };

        const numeric: string[] = [];

        // Check each column for numeric values
        columns.forEach(col => {
            const sample = data.slice(0, 10).map(row => row[col]);
            const numericCount = sample.filter(val =>
                typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '')
            ).length;

            if (numericCount / sample.length > 0.5) {
                numeric.push(col);
            }
        });

        // Prepare chart data
        const prepared = data.slice(0, 50).map((row, idx) => {
            const item: Record<string, unknown> = { index: idx + 1 };
            numeric.forEach(col => {
                const val = row[col];
                item[col] = typeof val === 'number' ? val : Number(val);
            });
            // Add first non-numeric column as label if available
            const labelCol = columns.find(c => !numeric.includes(c));
            if (labelCol) {
                item.label = String(row[labelCol]).slice(0, 20);
            }
            return item;
        });

        return { numericColumns: numeric, chartData: prepared };
    }, [data, columns]);

    // Don't show if no numeric data
    if (numericColumns.length === 0 || data.length === 0) {
        return null;
    }

    const renderChart = () => {
        const xAxisKey = chartData[0]?.label ? 'label' : 'index';

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey={xAxisKey}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                            />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            {numericColumns.slice(0, 4).map((col, idx) => (
                                <Bar key={col} dataKey={col} fill={COLORS[idx % COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey={xAxisKey}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                            />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            {numericColumns.slice(0, 4).map((col, idx) => (
                                <Line
                                    key={col}
                                    type="monotone"
                                    dataKey={col}
                                    stroke={COLORS[idx % COLORS.length]}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                // For pie chart, use first numeric column and aggregate if needed
                const pieData = chartData.slice(0, 8).map((item, idx) => ({
                    name: item.label || `Item ${idx + 1}`,
                    value: Number(item[numericColumns[0]]) || 0,
                }));

                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return null;
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                className="gap-2"
                size="sm"
            >
                <BarChart3 className="w-4 h-4" />
                {locale === 'ru' ? 'Показать график' : 'Show Chart'}
            </Button>
        );
    }

    return (
        <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-secondary/10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">
                        {locale === 'ru' ? 'Визуализация данных' : 'Data Visualization'}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
                        <button
                            onClick={() => setChartType('bar')}
                            className={`p-2 rounded transition-colors ${chartType === 'bar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            title={locale === 'ru' ? 'Столбчатая диаграмма' : 'Bar Chart'}
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setChartType('line')}
                            className={`p-2 rounded transition-colors ${chartType === 'line' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            title={locale === 'ru' ? 'Линейный график' : 'Line Chart'}
                        >
                            <LineChartIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setChartType('pie')}
                            className={`p-2 rounded transition-colors ${chartType === 'pie' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            title={locale === 'ru' ? 'Круговая диаграмма' : 'Pie Chart'}
                        >
                            <PieChartIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="text-xs text-muted-foreground">
                {locale === 'ru'
                    ? `Показаны первые ${Math.min(50, data.length)} строк • ${numericColumns.length} числовых столбцов`
                    : `Showing first ${Math.min(50, data.length)} rows • ${numericColumns.length} numeric columns`
                }
            </div>

            {renderChart()}
        </div>
    );
}
