import { useState, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { classifyLead } from '@/lib/leadScoring';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { MapPin, MessageCircle, StickyNote, ChevronRight, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import type { LeadWithQuiz } from './types';

export const MobilePipelineCard = memo(function MobilePipelineCard({
  lead,
  basePath,
  franchiseName,
  onStageChange,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  franchiseName?: string;
  onStageChange: (leadId: string) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      user_id: user.id,
      activity_type: 'note',
      content: noteText.trim(),
    });
    setSavingNote(false);
    if (error) {
      toast.error('Erro ao salvar nota');
    } else {
      toast.success('Nota adicionada');
      setNoteText('');
      setNoteOpen(false);
    }
  };

  const borderAccent = temp.borderAccent;
  const scoreColor = (lead.pontuacao_quintal || 0) >= 70 ? 'bg-emerald-500' : (lead.pontuacao_quintal || 0) >= 40 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div
      className={`bg-card border border-border/50 rounded-xl overflow-hidden shadow-xs border-l-[3px] ${borderAccent} animate-fade-in`}
    >
      <div
        className="p-3.5 cursor-pointer"
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{lead.nome || '—'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {lead.cidade && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />{lead.cidade}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={`${temp.bgColor} ${temp.color} border text-xs font-semibold`} variant="outline">
              {temp.emoji} {temp.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div className={`h-full rounded-full ${scoreColor} transition-all`} style={{ width: `${lead.pontuacao_quintal || 0}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums w-7 text-right">{lead.pontuacao_quintal || 0}%</span>
        </div>

        {franchiseName && (
          <div className="mt-1.5 ml-[46px]">
            <span className="text-xs text-muted-foreground">{franchiseName}</span>
          </div>
        )}
      </div>

      {/* Note section with CSS transition */}
      <div
        className="overflow-hidden border-t border-border/30 transition-all duration-200 ease-out"
        style={{
          maxHeight: noteOpen ? '200px' : '0px',
          opacity: noteOpen ? 1 : 0,
          borderTopWidth: noteOpen ? '1px' : '0px',
        }}
      >
        <div className="p-3 space-y-2">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escreva uma nota rápida..."
            className="text-base md:text-xs min-h-[50px] resize-none"
            autoFocus={noteOpen}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              disabled={!noteText.trim() || savingNote}
              onClick={handleSaveNote}
            >
              <Send className="w-3 h-3" />
              {savingNote ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setNoteOpen(false); setNoteText(''); }}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-border/30 divide-x divide-border/30">
        {lead.telefone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const fullPhone = toWhatsAppPhone(lead.telefone!);
              window.open(`https://wa.me/${fullPhone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-success hover:bg-success/5 transition-colors min-h-[44px]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setNoteOpen(v => !v);
          }}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors min-h-[44px]"
        >
          <StickyNote className="w-3.5 h-3.5" />
          Nota
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStageChange(lead.id);
          }}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors min-h-[44px]"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Mover
        </button>
      </div>
    </div>
  );
});
