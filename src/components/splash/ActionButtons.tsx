import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MessageCircle, FileText, Share2, Trophy, Download, ArrowRight, Sparkles, Star, Users } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';
import { getRankingGaucho, getYardClassification, getSharePhrase, getSocialComparison } from '@/lib/ranking';
import { getPoolImage } from '@/lib/poolImages';
import { ValorizationSimulator } from './ValorizationSimulator';
import { FriendChallenge } from './FriendChallenge';
import { trackEvent } from '@/lib/analytics';

interface ActionButtonsProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  whatsappNumber?: string;
  leadName?: string;
  refCode?: string;
  franchiseId?: string;
}

export function ActionButtons({ score, poolName, poolDescription, whatsappNumber, leadName, refCode, franchiseId }: ActionButtonsProps) {
  const ranking = getRankingGaucho(score);
  const classification = getYardClassification(score);
  const socialComparison = getSocialComparison(score);
  const [sharing, setSharing] = useState(false);

  const handleWhatsApp = () => {
    trackEvent('whatsapp_clicked', { franchiseId });
    const phone = whatsappNumber || '5551999999999';
    const message = encodeURIComponent(
      `Olá! Fiz o teste do Índice do Quintal Splash e meu quintal tem ${score}% de potencial (${classification.label}). O modelo recomendado foi a ${poolName}. Gostaria de saber mais!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    trackEvent('result_shared', { franchiseId, metadata: { plataforma: 'whatsapp' } });
    const phrase = getSharePhrase(score);
    const siteUrl = window.location.origin;
    const text = encodeURIComponent(
      `${phrase}\n\n${classification.emoji} ${classification.label}\n🏊 Modelo recomendado: ${poolName}\n\nDescubra o potencial do seu quintal:\n${siteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    trackEvent('result_shared', { franchiseId, metadata: { plataforma: 'link_copiado' } });
    navigator.clipboard.writeText(window.location.origin);
  };

  const generateShareImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#0d2847');
    gradient.addColorStop(1, '#061220');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(30,120,200,0.08)';
    ctx.beginPath(); ctx.arc(800, 400, 400, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(30,120,200,0.05)';
    ctx.beginPath(); ctx.arc(200, 1400, 500, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ÍNDICE DO QUINTAL', 540, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px Inter, sans-serif';
    ctx.fillText('SPLASH PISCINAS', 540, 250);

    // Score ring
    ctx.beginPath(); ctx.arc(540, 560, 195, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath(); ctx.arc(540, 560, 195, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.font = '900 110px Inter, sans-serif';
    ctx.fillText(`${score}%`, 540, 590);
    ctx.font = '400 24px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('de potencial', 540, 640);

    // Classification
    ctx.font = '700 42px Inter, sans-serif'; ctx.fillStyle = classification.color;
    ctx.fillText(`${classification.emoji} ${classification.label}`, 540, 830);

    // Main text
    ctx.font = '700 44px Inter, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText(`Meu quintal tem ${score}%`, 540, 950);
    ctx.fillText('de potencial para', 540, 1010);
    ctx.fillText('uma piscina Splash!', 540, 1070);

    // Ranking badge
    const badgeY = 1170;
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.beginPath(); ctx.roundRect(180, badgeY - 28, 720, 56, 28); ctx.fill();
    ctx.font = '600 26px Inter, sans-serif'; ctx.fillStyle = '#ffd700';
    ctx.fillText(`🏆 ${ranking.label}`, 540, badgeY + 8);

    // Model
    ctx.font = '400 30px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Modelo recomendado: ${poolName}`, 540, 1300);

    // Social comparison
    ctx.font = '400 26px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(socialComparison, 540, 1380);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(340, 1450); ctx.lineTo(740, 1450); ctx.stroke();

    // CTA
    ctx.font = '500 26px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Descubra o potencial do seu quintal em', 540, 1530);
    ctx.font = '700 30px Inter, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText('splashpiscinas.com.br', 540, 1575);

    // Footer
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 1820, 1080, 100);
    ctx.font = '400 20px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('© Splash Piscinas', 540, 1878);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };

  const handleShare = async () => {
    trackEvent('result_shared', { franchiseId, metadata: { plataforma: 'share_api' } });
    setSharing(true);
    try {
      const blob = await generateShareImage();
      if (!blob) return;
      const file = new File([blob], `meu-quintal-splash-${score}pct.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Meu quintal tem ${score}% de potencial!`,
          text: `${classification.emoji} ${classification.label} • ${ranking.label}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error('Share error:', err); }
    finally { setSharing(false); }
  };

  const handleDownload = async () => {
    const blob = await generateShareImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `meu-quintal-splash-${score}pct.png`; a.click();
    URL.revokeObjectURL(url);
  };

  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (score / 100) * circumference;
  const firstName = leadName?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background">
      {/* === HERO BANNER === */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #06101f 0%, #0b2a52 35%, #0d3468 60%, #081d38 100%)' }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-[-25%] right-[-15%] w-[65vw] h-[65vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(30,136,229,0.4), transparent 65%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-[-10%] left-[-20%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(233,30,145,0.3), transparent 65%)' }}
        />

        <div className="relative z-10 px-6 pt-10 pb-16 max-w-md mx-auto text-center">
          <motion.img
            src={logoSplash}
            alt="Splash Piscinas"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto w-20 mb-5"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-5"
          >
            Índice do Quintal Splash
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-1"
          >
            {firstName ? `${firstName}, seu quintal` : 'Seu quintal'}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-6"
          >
            é <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">incrível</span>! 🎉
          </motion.h2>

          {/* Score ring + stats */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', damping: 14 }}
            className="flex items-center justify-center gap-6 mb-6"
          >
            <div className="relative w-32 h-32">
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute inset-[-12px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(30,136,229,0.25), transparent 70%)' }}
              />
              <svg className="w-32 h-32 transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
                <circle cx="50" cy="50" r="46"
                  stroke="url(#actionGrad)" strokeWidth="4" fill="none" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(30,136,229,0.5))' }}
                />
                <defs>
                  <linearGradient id="actionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e88e5" />
                    <stop offset="100%" stopColor="#00e5ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className="text-4xl font-black text-white" style={{ textShadow: '0 0 30px rgba(30,136,229,0.4)' }}>
                  {score}
                </span>
                <span className="text-[10px] font-medium text-white/40">pontos</span>
              </div>
            </div>

            <div className="text-left space-y-3">
              <div>
                <p className="text-white/35 text-[10px] uppercase tracking-wider">Potencial</p>
                <p className="text-white text-lg font-bold">{score}%</p>
              </div>
              <div>
                <p className="text-white/35 text-[10px] uppercase tracking-wider">Modelo</p>
                <p className="text-white text-sm font-semibold">{poolName}</p>
              </div>
            </div>
          </motion.div>

          {/* Classification badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-2"
            style={{
              background: `linear-gradient(135deg, ${classification.color}18, ${classification.color}08)`,
              border: `1px solid ${classification.color}30`,
            }}
          >
            <span className="text-lg">{classification.emoji}</span>
            <span className="font-bold text-sm" style={{ color: classification.color }}>{classification.label}</span>
          </motion.div>

          {/* Ranking badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.85, type: 'spring' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))',
              border: '1px solid rgba(255,215,0,0.2)',
              boxShadow: '0 0 25px rgba(255,215,0,0.06)',
            }}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm text-amber-300">{ranking.label}</span>
          </motion.div>

          {/* Social comparison */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95 }}
            className="text-white/45 text-xs italic mb-4"
          >
            {socialComparison}
          </motion.p>

          {/* Pool card */}
          {poolDescription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="rounded-2xl p-4 text-left mt-2 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-[9px] font-bold text-blue-300 uppercase tracking-[0.15em]">Recomendação</span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{poolDescription}</p>
            </motion.div>
          )}

          {/* 5 stars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex items-center justify-center gap-0.5 mt-5"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 + i * 0.08 }}>
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </motion.div>
            ))}
            <span className="text-white/25 text-[10px] ml-1.5">Análise premium</span>
          </motion.div>
        </div>
      </motion.div>

      {/* === CONTENT SECTIONS === */}
      <div className="px-6 max-w-md mx-auto -mt-2 relative z-20">

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6"
        >
          <Button
            onClick={handleWhatsApp}
            className="w-full py-7 text-[15px] rounded-2xl font-bold shadow-xl shadow-primary/25 gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.01] transition-all duration-300 gap-2 group"
          >
            <MessageCircle className="w-5 h-5" />
            Falar com um consultor
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Tire suas dúvidas e solicite um orçamento pelo WhatsApp
          </p>
        </motion.div>

        {/* Challenge CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35 }}
          className="mt-5 rounded-2xl p-5 text-center"
          style={{
            background: 'linear-gradient(135deg, hsl(207 90% 54% / 0.08), hsl(180 100% 50% / 0.04))',
            border: '1px solid hsl(207 90% 54% / 0.15)',
          }}
        >
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">
            Será que o quintal dos seus amigos tem mais potencial que o seu?
          </p>
          <p className="text-xs text-muted-foreground mb-3">Desafie seus amigos e descubra!</p>
          <Button
            variant="outline"
            onClick={handleShareWhatsApp}
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Desafiar um amigo
          </Button>
        </motion.div>

        {/* Valorization */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
          <ValorizationSimulator score={score} />
        </motion.div>

        {/* Friend Challenge */}
        {refCode && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}>
            <FriendChallenge refCode={refCode} score={score} leadName={leadName} />
          </motion.div>
        )}

        {/* Share & Secondary Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
          className="space-y-3 mt-8 pb-14"
        >
          {/* Share buttons row */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleShareWhatsApp}
              className="py-5 text-xs rounded-2xl font-medium border-border hover:bg-accent gap-1.5 flex-col h-auto"
            >
              <MessageCircle className="w-4 h-4 text-green-500" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              disabled={sharing}
              className="py-5 text-xs rounded-2xl font-medium border-border hover:bg-accent gap-1.5 flex-col h-auto"
            >
              <Share2 className="w-4 h-4 text-primary" />
              {sharing ? 'Gerando...' : 'Compartilhar'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="py-5 text-xs rounded-2xl font-medium border-border hover:bg-accent gap-1.5 flex-col h-auto"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              Baixar imagem
            </Button>
          </div>

          <Button
            onClick={handleWhatsApp}
            variant="outline"
            className="w-full py-6 text-sm rounded-2xl font-semibold border-primary/20 text-primary hover:bg-primary/5 transition-all gap-2"
          >
            <FileText className="w-4 h-4" />
            Solicitar orçamento
          </Button>

          <Button
            variant="outline"
            className="w-full py-6 text-sm rounded-2xl font-semibold border-border hover:bg-accent transition-all gap-2"
          >
            <FileText className="w-4 h-4" />
            Receber estimativa gratuita
          </Button>

          {/* Trust footer */}
          <div className="text-center pt-4 space-y-2">
            <img src={logoSplash} alt="Splash" className="mx-auto w-16 opacity-30" />
            <p className="text-[10px] text-muted-foreground/50">
              © Splash Piscinas • Tecnologia para o seu quintal
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
