import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Target, Edit2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface MonthlyGoalsProps {
  franchiseId: string;
  soldThisMonth: number;
}

export function MonthlyGoals({ franchiseId, soldThisMonth }: MonthlyGoalsProps) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [goalValue, setGoalValue] = useState('');

  const { data: goal } = useQuery({
    queryKey: ['franchise-goal', franchiseId, month, year],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchise_goals' as any)
        .select('*')
        .eq('franchise_id', franchiseId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
      return data as { id: string; sales_goal: number } | null;
    },
    enabled: !!franchiseId,
  });

  const upsertGoal = useMutation({
    mutationFn: async (newGoal: number) => {
      if (goal) {
        await supabase.from('franchise_goals' as any).update({ sales_goal: newGoal, updated_at: new Date().toISOString() }).eq('id', goal.id);
      } else {
        await supabase.from('franchise_goals' as any).insert({ franchise_id: franchiseId, month, year, sales_goal: newGoal });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise-goal'] });
      setEditing(false);
      toast.success('Meta atualizada!');
    },
  });

  const salesGoal = goal?.sales_goal || 5;
  const progress = salesGoal > 0 ? Math.min(Math.round((soldThisMonth / salesGoal) * 100), 100) : 0;
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="card-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Meta de {monthName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold tracking-tight text-foreground">
                {soldThisMonth}<span className="text-muted-foreground text-lg font-medium">/{salesGoal}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">vendas realizadas</p>
            </div>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={goalValue}
                  onChange={e => setGoalValue(e.target.value)}
                  className="w-20 h-8 text-sm"
                  placeholder={String(salesGoal)}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                  const v = parseInt(goalValue);
                  if (v > 0) upsertGoal.mutate(v);
                  else setEditing(false);
                }}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={() => { setGoalValue(String(salesGoal)); setEditing(true); }}>
                <Edit2 className="w-3 h-3" /> Editar meta
              </Button>
            )}
          </div>

          <Progress value={progress} className="h-3" />

          <p className={`text-xs font-medium ${progress >= 100 ? 'text-emerald-600' : progress >= 60 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {progress >= 100 ? '🎉 Meta atingida! Parabéns!' : `${progress}% da meta atingida`}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
