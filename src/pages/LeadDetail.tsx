import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageCircle, Phone, Mail } from 'lucide-react';

interface Lead {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  respostas_questionario: Record<string, string> | null;
  foto1: string | null;
  foto2: string | null;
  foto3: string | null;
  foto4: string | null;
  status_lead: string;
  observacoes: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  em_negociacao: 'Em Negociação',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

const questionLabels: Record<string, { label: string; icon: string }> = {
  espaco: { label: 'Espaço disponível', icon: '📏' },
  moradia: { label: 'Situação da casa', icon: '🏠' },
  uso: { label: 'Perfil de uso', icon: '👨‍👩‍👧‍👦' },
  intencao: { label: 'Quando pretende comprar', icon: '📅' },
  preferencia: { label: 'Preferência', icon: '✨' },
  orcamento: { label: 'Orçamento estimado', icon: '💰' },
  cidade: { label: 'Cidade', icon: '📍' },
};

const answerLabels: Record<string, string> = {
  // Espaço
  'ate-3': 'Até 3 metros',
  '3-5': 'Entre 3 e 5 metros',
  '5-7': 'Entre 5 e 7 metros',
  'mais-7': 'Mais de 7 metros',
  // Moradia
  'minha': 'Já é minha casa',
  'construindo': 'Estou construindo',
  'planejando': 'Ainda estou planejando',
  // Uso
  'casal': 'Momentos a dois',
  'familia-pequena': 'Diversão com os filhos',
  'familia-grande': 'Reunir toda a família',
  'amigos': 'Churrascos e festas',
  // Intenção
  '2026': 'Ainda em 2026',
  '2026-2027': 'Talvez em 2026 ou 2027',
  'pesquisando': 'Só estou pesquisando',
  // Preferência
  'prainha': 'Prainha',
  'spa': 'Spa ou Hidromassagem',
  'simples': 'Piscina clássica e elegante',
  'nao-sei': 'Ainda não sei',
  // Orçamento
  'ate-18': 'Até R$ 18 mil',
  '18-30': 'R$ 18 a 30 mil',
  '30-50': 'R$ 30 a 50 mil',
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  const loadLead = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id!)
      .single();
    if (data) {
      setLead(data as Lead);
      setStatus(data.status_lead);
      setObservacoes(data.observacoes || '');
    }
    setLoading(false);
  };

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    await supabase
      .from('leads')
      .update({ status_lead: status as any, observacoes })
      .eq('id', lead.id);
    setSaving(false);
  };

  const photos = lead ? [lead.foto1, lead.foto2, lead.foto3, lead.foto4].filter(Boolean) as string[] : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lead) {
    return <div className="p-6 text-center text-muted-foreground">Lead não encontrado.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
          {lead.nome || 'Lead sem nome'}
        </h1>
        <span className="text-3xl font-extrabold text-primary">{lead.pontuacao_quintal || 0}%</span>
      </div>

      {/* Contact info */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          {lead.telefone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{lead.telefone}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => {
                  const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem? Vi que você fez o teste do Índice do Quintal Splash!`);
                  window.open(`https://wa.me/55${lead.telefone}?text=${msg}`, '_blank');
                }}
              >
                <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{lead.email}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            📍 {lead.cidade || '—'} • Modelo: <strong>{lead.modelo_recomendado || '—'}</strong> •{' '}
            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
          </p>
        </CardContent>
      </Card>

      {/* Photos */}
      {photos.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Fotos do Quintal</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {photos.map((url, i) => (
              <img key={i} src={url} alt={`Quintal ${i + 1}`} className="rounded-lg w-full aspect-square object-cover" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quiz answers */}
      {lead.respostas_questionario && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Respostas do Questionário</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(lead.respostas_questionario).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{questionLabels[key] || key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status + Notes */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Gerenciar Lead</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Adicionar observações sobre este lead..."
              maxLength={1000}
            />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
