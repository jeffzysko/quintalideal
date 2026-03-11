import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, FileText, Share2, Trophy, Download, ArrowRight, Sparkles, Star, Zap } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';
import { getRankingGaucho } from '@/lib/ranking';
import { ValorizationSimulator } from './ValorizationSimulator';
import { FriendChallenge } from './FriendChallenge';

interface ActionButtonsProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  whatsappNumber?: string;
  leadName?: string;
  refCode?: string;
}

export function ActionButtons({ score, poolName, poolDescription, whatsappNumber, leadName, refCode }: ActionButtonsProps) {
  const ranking = getRankingGaucho(score);
  const [sharing, setSharing] = useState(false);

  const handleWhatsApp = () => {
    const phone = whatsappNumber || '5551999999999';
    const message = encodeURIComponent(
      `Olá! Fiz o teste do Índice do Quintal Splash e meu quintal tem ${score}% de potencial. O modelo recomendado foi a ${poolName}. Gostaria de saber mais!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
    ctx.beginPath();
    ctx.arc(800, 400, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(30,120,200,0.05)';
    ctx.beginPath();
    ctx.arc(200, 1400, 500, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ÍNDICE DO QUINTAL', 540, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px Inter, sans-serif';
    ctx.fillText('SPLASH PISCINAS', 540, 250);

    ctx.beginPath();
    ctx.arc(540, 580, 195, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(540, 580, 195, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.strokeStyle = '#1e88e5';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 110px Inter, sans-serif';
    ctx.fillText(`${score}%`, 540, 610);
    ctx.font = '400 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('de potencial', 540, 660);

    ctx.font = '700 46px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ['Meu quintal tem', `${score}% de potencial para`, 'uma piscina Splash!']
      .forEach((line, i) => ctx.fillText(line, 540, 870 + i * 65));

    const badgeY = 1120;
    ctx.fillStyle = 'rgba(30,136,229,0.15)';
    ctx.beginPath();
    ctx.roundRect(220, badgeY - 28, 640, 56, 28);
    ctx.fill();
    ctx.font = '600 28px Inter, sans-serif';
    ctx.fillStyle = '#64b5f6';
    ctx.fillText(`🏆 ${ranking.label}`, 540, badgeY + 8);

    ctx.font = '400 30px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Modelo recomendado: ${poolName}`, 540, 1300);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(340, 1400);
    ctx.lineTo(740, 1400);
    ctx.stroke();

    ctx.font = '500 26px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Descubra o potencial do seu quintal em', 540, 1490);
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('splashpiscinas.com.br', 540, 1535);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 1820, 1080, 100);
    ctx.font = '400 20px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('© Splash Piscinas', 540, 1878);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateShareImage();
      if (!blob) return;
      const file = new File([blob], `meu-quintal-splash-${score}pct.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Meu quintal tem ${score}% de potencial!`,
          text: `🏊 ${ranking.label} — Descubra o potencial do seu quintal em splashpiscinas.com.br`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateShareImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meu-quintal-splash-${score}pct.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner with dark gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0a1e3d 0%, #0d3060 40%, #0a2445 100%)',
        }}
      >
        {/* Decorative glow circles */}
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(207 90% 50%), transparent 70%)' }}
        />
        <div className="absolute bottom-[-10%] left-[-15%] w-[50vw] h-[50vw] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(322 85% 50%), transparent 70%)' }}
        />

        <div className="relative z-10 px-6 pt-10 pb-14 max-w-md mx-auto text-center">
          <motion.img
            src={logoSplash}
            alt="Splash Piscinas"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto w-24 mb-6"
          />

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-2"
          >
            {leadName ? `Parabéns, ${leadName.split(' ')[0]}!` : 'Parabéns!'} 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/60 text-sm mb-8"
          >
            Seu quintal foi analisado com sucesso
          </motion.p>

          {/* Large score display */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', damping: 15 }}
            className="relative mx-auto w-44 h-44 mb-6"
          >
            <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
              <circle
                cx="60" cy="60" r="54"
                stroke="url(#scoreGradient)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e88e5" />
                  <stop offset="100%" stopColor="#42a5f5" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold text-white tracking-tight">{score}</span>
              <span className="text-sm font-medium text-white/50">pontos</span>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-white text-lg font-semibold mb-4"
          >
            Seu quintal tem <span className="text-blue-300">{score}%</span> de potencial!
          </motion.p>

          {/* Ranking badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6"
            style={{ background: 'rgba(30,136,229,0.15)', border: '1px solid rgba(30,136,229,0.25)' }}
          >
            <Trophy className="w-4 h-4 text-blue-300" />
            <span className="font-semibold text-sm text-blue-300">{ranking.label}</span>
          </motion.div>

          {/* Pool recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="rounded-2xl p-5 text-left mb-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-300" />
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Modelo recomendado</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{poolName}</h3>
            {poolDescription && <p className="text-sm text-white/50 leading-relaxed">{poolDescription}</p>}
          </motion.div>
        </div>
      </motion.div>

      {/* Content below hero */}
      <div className="px-6 max-w-md mx-auto -mt-4 relative z-20">
        {/* Valorization Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <ValorizationSimulator score={score} />
        </motion.div>

        {/* Friend Challenge Section */}
        {refCode && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
          >
            <FriendChallenge refCode={refCode} score={score} leadName={leadName} />
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          className="space-y-3 mt-8 pb-12"
        >
          {/* Primary CTA — most important */}
          <Button
            onClick={handleWhatsApp}
            className="w-full py-7 text-base rounded-2xl font-bold shadow-lg shadow-primary/20 gradient-blue hover:opacity-90 transition-all gap-2 group"
          >
            <MessageCircle className="w-5 h-5" />
            Quero ver como ficaria no meu quintal
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Secondary */}
          <Button
            onClick={handleWhatsApp}
            variant="outline"
            className="w-full py-6 text-sm rounded-2xl font-semibold border-primary/20 text-primary hover:bg-primary/5 transition-all gap-2"
          >
            <Zap className="w-4 h-4" />
            Falar com especialista
          </Button>

          {/* Tertiary */}
          <Button
            variant="outline"
            className="w-full py-6 text-sm rounded-2xl font-semibold border-border hover:bg-accent transition-all gap-2"
          >
            <FileText className="w-4 h-4" />
            Receber estimativa gratuita
          </Button>

          {/* Share row */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-5 text-xs rounded-2xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? 'Gerando...' : 'Compartilhar'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDownload}
              className="flex-1 py-5 text-xs rounded-2xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5"
            >
              <Download className="w-4 h-4" />
              Baixar imagem
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
