import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  iconBg?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ icon: Icon, iconBg = 'icon-bg-blue', title, subtitle, children }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
