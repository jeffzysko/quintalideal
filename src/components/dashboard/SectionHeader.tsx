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
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="w-[18px] h-[18px] text-primary" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
