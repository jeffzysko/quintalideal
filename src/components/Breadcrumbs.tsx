import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  admin: 'Admin',
  franquia: 'Franquia',
  painel: 'Painel',
  lead: 'Lead',
  radar: 'Radar de Mercado',
  perfil: 'Perfil',
  suporte: 'Suporte',
  mapa: 'Mapa',
  docs: 'Documentação',
  webhook: 'Webhook',
};

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { pathname } = useLocation();

  const crumbs: BreadcrumbItem[] = items || (() => {
    const segments = pathname.split('/').filter(Boolean);
    const result: BreadcrumbItem[] = [];
    let path = '';

    for (let i = 0; i < segments.length; i++) {
      path += `/${segments[i]}`;
      const isLast = i === segments.length - 1;
      const isUuid = /^[0-9a-f]{8}-/.test(segments[i]);

      if (isUuid) {
        result.push({ label: 'Detalhes' });
      } else {
        result.push({
          label: ROUTE_LABELS[segments[i]] || segments[i],
          href: isLast ? undefined : path,
        });
      }
    }
    return result;
  })();

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex flex-row items-center gap-1 text-xs text-muted-foreground mb-4 sm:mb-5 overflow-x-auto scrollbar-none h-7">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex flex-row items-center gap-1 shrink-0">
          {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/50 block" />}
          {crumb.href ? (
            <Link to={crumb.href} className="hover:text-foreground transition-colors font-medium whitespace-nowrap">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-semibold whitespace-nowrap">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
