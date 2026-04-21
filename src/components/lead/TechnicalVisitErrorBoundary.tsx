import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class TechnicalVisitErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error('[TechnicalVisit] error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 rounded-md border border-destructive/30 bg-destructive/5 text-sm">
          <strong className="text-destructive">Erro na visita técnica:</strong>
          <pre className="mt-2 text-xs whitespace-pre-wrap text-destructive">{this.state.error.message}</pre>
          <pre className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground max-h-64 overflow-auto">{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
