'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-6">
                    <div className="max-w-md w-full space-y-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Something went wrong</h2>
                                <p className="text-muted-foreground">
                                    An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                                </p>
                            </div>

                            {this.state.error && (
                                <details className="w-full text-left">
                                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        Show error details
                                    </summary>
                                    <div className="mt-3 p-4 rounded-lg bg-secondary/50 border border-border/50">
                                        <p className="text-sm font-mono text-red-400 mb-2">
                                            {this.state.error.message}
                                        </p>
                                        {this.state.errorInfo && (
                                            <pre className="text-xs text-muted-foreground overflow-x-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                </details>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={this.handleReset}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="gap-2"
                                >
                                    Reload Page
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
