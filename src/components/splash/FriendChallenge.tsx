import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Link2, Copy, Check, Crown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/constants';

interface FriendData {
  nome: string;
  pontuacao_quintal: number;
}

interface FriendChallengeProps {
  refCode: string;
  score: number;
  leadName?: string;
}

export function FriendChallenge({ refCode, score, leadName }: FriendChallengeProps) {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${SITE_URL}/explorar?ref=${refCode}`;

  useEffect(() => {
    loadFriends();
  }, [refCode]);

  const loadFriends = async () => {
    const { data } = await supabase
      .from('leads')
      .select('nome, pontuacao_quintal')
      .eq('referred_by', refCode)
      .order('pontuacao_quintal', { ascending: false })
      .limit(10);
    if (data) setFriends(data as FriendData[]);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏊 Fiz o teste do Índice do Quintal Splash e meu quintal tem ${score}% de potencial! Descubra o do seu: ${inviteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const allParticipants = [
    { nome: leadName || 'Você', pontuacao_quintal: score, isMe: true },
    ...friends.map(f => ({ ...f, isMe: false })),
  ].sort((a, b) => (b.pontuacao_quintal || 0) - (a.pontuacao_quintal || 0));

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden mt-6">
      {/* Header with gradient accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(207 90% 42%), hsl(322 85% 50%))' }} />
      
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Crown className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Desafio dos Quintais</h3>
            <p className="text-xs text-muted-foreground">Quem tem o melhor quintal?</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Invite link */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-muted rounded-xl px-3 py-3 text-xs text-muted-foreground truncate flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate font-mono">{inviteUrl}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="shrink-0 rounded-xl h-auto px-3"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <Button
          onClick={handleShareWhatsApp}
          className="w-full rounded-xl py-5 text-sm font-semibold mb-5 gap-2"
          style={{ background: '#25D366' }}
        >
          <Send className="w-4 h-4" />
          Convidar amigos pelo WhatsApp
        </Button>

        {/* Rankings */}
        {allParticipants.length > 1 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Ranking dos Quintais</p>
            </div>
            <div className="space-y-2">
              {allParticipants.slice(0, 5).map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.1, 0.15) }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                    p.isMe
                      ? 'bg-primary/8 border border-primary/15 shadow-sm'
                      : 'bg-muted/40 hover:bg-muted/60'
                  }`}
                >
                  <span className="text-lg w-8 text-center">
                    {i < 3 ? medals[i] : <span className="text-xs font-bold text-muted-foreground">{i + 1}º</span>}
                  </span>
                  <span className={`flex-1 font-semibold text-sm ${p.isMe ? 'text-primary' : 'text-foreground'}`}>
                    {p.isMe ? (p.nome?.split(' ')[0] || 'Você') + ' (você)' : p.nome?.split(' ')[0] || 'Amigo'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${p.pontuacao_quintal || 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-sm text-primary w-10 text-right">{p.pontuacao_quintal || 0}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 rounded-2xl bg-muted/30 border border-dashed border-border">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Seus amigos ainda não participaram
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Convide-os e descubra quem tem o melhor quintal! 🎯
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
