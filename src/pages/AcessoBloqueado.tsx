import { Lock } from 'lucide-react';

export default function AcessoBloqueado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
          <Lock className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Acesso desativado</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sua conta foi desativada. Entre em contato com o suporte para mais informações.
        </p>
      </div>
    </div>
  );
}
