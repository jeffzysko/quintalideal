import { forwardRef } from 'react';
import { getTopTags } from '@/lib/smart-tags';

interface SmartTagBadgesProps {
  lead: {
    status_lead: string;
    created_at: string;
    updated_at?: string;
    pontuacao_quintal: number | null;
    telefone?: string | null;
    email?: string | null;
    referred_by?: string | null;
    respostas_questionario?: Record<string, string> | null;
  };
  max?: number;
}

export const SmartTagBadges = forwardRef<HTMLSpanElement, SmartTagBadgesProps>(
  function SmartTagBadges({ lead, max = 2 }, ref) {
    const tags = getTopTags(lead, max);
    if (tags.length === 0) return null;

    return (
      <>
        {tags.map((tag, i) => (
          <span
            key={tag.key}
            ref={i === 0 ? ref : undefined}
            className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${tag.bg} ${tag.color}`}
            title={tag.label}
          >
            {tag.emoji} {tag.label}
          </span>
        ))}
      </>
    );
  }
);
