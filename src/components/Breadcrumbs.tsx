import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItemData {
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
  items?: BreadcrumbItemData[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { pathname } = useLocation();

  const crumbs: BreadcrumbItemData[] = items || (() => {
    const segments = pathname.split('/').filter(Boolean);
    const result: BreadcrumbItemData[] = [];
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
    <Breadcrumb className="mb-4 sm:mb-5 overflow-x-auto scrollbar-none">
      <BreadcrumbList className="min-w-max flex-nowrap gap-1 whitespace-nowrap text-xs sm:gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className="h-7 shrink-0 items-center">
                {crumb.href ? (
                  <BreadcrumbLink
                    asChild
                    className="inline-flex h-7 items-center rounded-md px-0.5 font-medium leading-none"
                  >
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="inline-flex h-7 items-center rounded-md px-0.5 font-semibold leading-none">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>

              {!isLast && (
                <BreadcrumbSeparator className="flex h-7 shrink-0 items-center text-muted-foreground/50 [&>svg]:size-3" />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
