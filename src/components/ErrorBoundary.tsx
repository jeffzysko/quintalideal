import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);

    supabase.from('error_logs').insert({
      source: 'frontend' as const,
      severity: 'critical',
      function_name: info.componentStack?.split('\n')[1]?.trim() || 'unknown_component',
      message: error.message,
      stack: error.stack || null,
      metadata: { componentStack: info.componentStack },
    }).then(() => {});
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">Algo deu errado</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <Button onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
