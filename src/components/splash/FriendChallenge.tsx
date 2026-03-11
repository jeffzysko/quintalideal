import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Link2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface FriendChallenge {
  nome: string;
  pontuacao_quintal: number;
}

interface FriendChallengeProps {
  refCode: string;
  score: number;
  leadName?: string;
}

export function FriendChallenge({ refCode, score, leadName }: FriendChallengeProps) {
  const [friends, setFriends] = useState<FriendChallenge[]>([]);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/explorar?ref=${refCode}`;

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
    if (data) setFriends(data as FriendChallenge[]);
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

  // Build ranking including the current user
  const allParticipants = [
    { nome: leadName || 'Você', pontuacao_quintal: score, isMe: true },
    ...friends.map(f => ({ ...f, isMe: false })),
  ].sort((a, b) => (b.pontuacao_quintal || 0) - (a.pontuacao_quintal || 0));

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border rounded-2xl p-5 mt-5 text-left shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-secondary" />
        <h3 className="font-bold text-sm" style={{ fontFamily: 'Montserrat' }}>
          Desafio dos Quintais
        </h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Convide seus amigos para fazer o teste e descubra quem tem o quintal com maior potencial.
      </p>

      {/* Invite link */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{inviteUrl}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      <Button
        size="sm"
        onClick={handleShareWhatsApp}
        className="w-full mb-4 bg-[#25D366] hover:bg-[#1fb855] text-white text-xs font-bold rounded-full"
      >
        Convidar pelo WhatsApp
      </Button>

      {/* Rankings */}
      {allParticipants.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            Ranking dos Quintais
          </p>
          {allParticipants.slice(0, 5).map((p, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                p.isMe ? 'bg-primary/10 border border-primary/20 font-bold' : 'bg-muted/50'
              }`}
            >
              <span>
                {i < 3 ? medals[i] : `${i + 1}º`}{' '}
                {p.isMe ? (p.nome?.split(' ')[0] || 'Você') + ' (você)' : p.nome?.split(' ')[0] || 'Amigo'}
              </span>
              <span className="font-bold text-primary">{p.pontuacao_quintal || 0}%</span>
            </div>
          ))}
        </div>
      )}

      {allParticipants.length <= 1 && (
        <div className="text-center py-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Seus amigos ainda não participaram. Convide-os! 🎯
          </p>
        </div>
      )}
    </motion.div>
  );
}
