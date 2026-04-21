import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

/**
 * Cabeçalho contextual usado dentro de páginas com navegação interna por abas
 * (ex: AdminDashboard, FranchiseDashboard). Identifica visualmente a seção
 * ativa sem duplicar com a barra de abas no topo.
 *
 * Para páginas standalone (sem abas internas), use `<PageHeader>`.
 */
export function SectionHeader({ title, subtitle, rightSlot }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {rightSlot && (
        <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
      )}
    </div>
  );
}
