import { useMemo, useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  actionPath: string | null; // null = scroll action
  visible: boolean;
}

function lsKey(base: string, fid: string) {
  return `${base}-${fid}`;
}

function getLs(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

// Subscribe to localStorage changes for reactivity
const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};
const getSnapshot = () => {
  try { return JSON.stringify(localStorage); } catch { return ''; }
};

export function useOnboardingChecklist(franchiseId: string | null) {
  // Force re-render on localStorage changes
  useSyncExternalStore(subscribe, getSnapshot);

  const { data: franchiseData, isLoading: loadingFranchise } = useQuery({
    queryKey: ['onboarding-franchise', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchises')
        .select('responsavel, whatsapp, orcamento_plan_active, whatsapp_plan_active')
        .eq('id', franchiseId!)
        .maybeSingle();
      return data;
    },
    enabled: !!franchiseId,
    staleTime: 0,
  });

  const { data: proposalCount = 0, isLoading: loadingProposals } = useQuery({
    queryKey: ['onboarding-proposals-count', franchiseId],
    queryFn: async () => {
      const { count } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('franchise_id', franchiseId!);
      return count || 0;
    },
    enabled: !!franchiseId,
    staleTime: 0,
  });

  const dismissed = franchiseId ? getLs(lsKey('qi-onboarding-dismissed', franchiseId)) : false;

  const items = useMemo<ChecklistItem[]>(() => {
    if (!franchiseId || !franchiseData) return [];

    const hasPlan = franchiseData.orcamento_plan_active || franchiseData.whatsapp_plan_active;
    const sharedLink = getLs(lsKey('qi-shared-link', franchiseId));
    const visitedPlans = getLs(lsKey('qi-visited-plans', franchiseId));

    return [
      {
        key: 'profile',
        title: 'Complete seu perfil',
        description: 'Preencha o responsável e WhatsApp da franquia.',
        done: !!(franchiseData.responsavel?.trim() && franchiseData.whatsapp?.trim()),
        actionLabel: 'Fazer agora →',
        actionPath: '/perfil',
        visible: true,
      },
      {
        key: 'proposal',
        title: hasPlan ? 'Crie seu primeiro orçamento' : 'Conheça o plano de Orçamentos',
        description: hasPlan
          ? 'Envie uma proposta profissional para seu cliente.'
          : 'Descubra como enviar propostas pelo Quintal Ideal.',
        done: hasPlan ? proposalCount > 0 : false,
        actionLabel: 'Fazer agora →',
        actionPath: hasPlan ? '/propostas/new' : '/planos',
        visible: true,
      },
      {
        key: 'share',
        title: 'Compartilhe seu link de divulgação',
        description: 'Copie e envie seu link exclusivo nas redes e WhatsApp.',
        done: sharedLink,
        actionLabel: 'Fazer agora →',
        actionPath: null, // scroll to element
        visible: true,
      },
      {
        key: 'plans',
        title: 'Conheça os planos disponíveis',
        description: 'Explore os add-ons para expandir seus recursos.',
        done: hasPlan || visitedPlans,
        actionLabel: 'Fazer agora →',
        actionPath: '/planos',
        visible: true,
      },
    ];
  }, [franchiseId, franchiseData, proposalCount]);

  const visibleItems = items.filter(i => i.visible);
  const doneCount = visibleItems.filter(i => i.done).length;
  const allDone = visibleItems.length > 0 && doneCount === visibleItems.length;

  const dismiss = useCallback(() => {
    if (!franchiseId) return;
    localStorage.setItem(lsKey('qi-onboarding-dismissed', franchiseId), 'true');
    window.dispatchEvent(new Event('storage'));
  }, [franchiseId]);

  const markSharedLink = useCallback(() => {
    if (!franchiseId) return;
    localStorage.setItem(lsKey('qi-shared-link', franchiseId), 'true');
    window.dispatchEvent(new Event('storage'));
  }, [franchiseId]);

  const markVisitedPlans = useCallback(() => {
    if (!franchiseId) return;
    localStorage.setItem(lsKey('qi-visited-plans', franchiseId), 'true');
    window.dispatchEvent(new Event('storage'));
  }, [franchiseId]);

  return {
    items: visibleItems,
    doneCount,
    allDone,
    dismissed,
    loading: loadingFranchise || loadingProposals,
    dismiss,
    markSharedLink,
    markVisitedPlans,
  };
}
