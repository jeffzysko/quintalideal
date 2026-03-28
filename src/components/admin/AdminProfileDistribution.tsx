import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { Users } from 'lucide-react';
import { normalizeQuizToV2, detectCustomerProfile, type CustomerProfile } from '@/lib/scoring-v2';

const PROFILE_META: Record<CustomerProfile, { label: string; color: string; emoji: string }> = {
  RELAXADOR: { label: 'Relaxador', color: 'hsl(207, 90%, 42%)', emoji: '🧘' },
  FAMILIA: { label: 'Família', color: 'hsl(152, 60%, 42%)', emoji: '👨‍👩‍👧‍👦' },
  SOCIAL: { label: 'Social', color: 'hsl(36, 90%, 50%)', emoji: '🎉' },
  PREMIUM: { label: 'Premium', color: 'hsl(280, 60%, 50%)', emoji: '💎' },
  COMPACTO: { label: 'Compacto', color: 'hsl(0, 70%, 55%)', emoji: '📐' },
};

interface AdminProfileDistributionProps {
  orgFilter?: string | null;
}

export function AdminProfileDistribution({ orgFilter }: AdminProfileDistributionProps) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['admin-profile-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, respostas_questionario, franquia_id')
        .not('respostas_questionario', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1500);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    const filtered = orgFilter ? leads.filter(l => l.franquia_id === orgFilter) : leads;
    const counts: Record<CustomerProfile, number> = {
      RELAXADOR: 0, FAMILIA: 0, SOCIAL: 0, PREMIUM: 0, COMPACTO: 0,
    };

    filtered.forEach(lead => {
      try {
        const answers = lead.respostas_questionario as Record<string, string> | null;
        if (!answers) return;
        const input = normalizeQuizToV2(answers);
        const profile = detectCustomerProfile(input);
        counts[profile]++;
      } catch {
        // skip malformed data
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([key, count]) => ({
        profile: key as CustomerProfile,
        label: `${PROFILE_META[key as CustomerProfile].emoji} ${PROFILE_META[key as CustomerProfile].label}`,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: PROFILE_META[key as CustomerProfile].color,
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads, orgFilter]);

  const total = chartData.reduce((s, d) => s + d.count, 0);

  if (isLoading) {
    return (
      <Card className="card-premium">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4" /> Perfil dos Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4" /> Perfil dos Leads
          <span className="text-xs font-normal text-muted-foreground ml-auto">{total} leads analisados</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {total === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">Sem dados de perfil</p>
        ) : (
          <>
            <ChartContainer config={{}} className="h-[200px] sm:h-[250px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number, _name: string, props: any) =>
                    [`${value} leads (${props.payload.pct}%)`, 'Total']
                  }
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                  {chartData.map((entry) => (
                    <Cell key={entry.profile} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            {/* Legend pills */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {chartData.map(d => (
                <span
                  key={d.profile}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${d.color}15`, color: d.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.label} · {d.pct}%
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
