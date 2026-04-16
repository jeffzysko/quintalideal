import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LeadCardAssigneeProps {
  assignedName: string | null;
}

export function LeadCardAssignee({ assignedName }: LeadCardAssigneeProps) {
  if (!assignedName) return null;

  const initials = assignedName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 cursor-help">
          <span className="text-[9px] font-bold text-primary">{initials}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs py-1 px-2">
        Responsável: {assignedName}
      </TooltipContent>
    </Tooltip>
  );
}
