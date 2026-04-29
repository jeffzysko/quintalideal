import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useProposalRealtime(franchiseId: string | null) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!franchiseId) return;

    const channel = supabase
      .channel('proposal-views')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'proposal_views',
        filter: `franchise_id=eq.${franchiseId}`
      }, (payload) => {
        toast.success(`📄 ${payload.new.client_name || 'Seu cliente'} acabou de abrir a proposta!`, {
          duration: 8000,
          action: {
            label: 'Ver proposta',
            onClick: () => navigate(`/propostas/${payload.new.proposal_id}`)
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [franchiseId, navigate]);
}
