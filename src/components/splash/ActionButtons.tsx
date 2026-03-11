import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MessageCircle, FileText, Share2, Trophy, Download, ArrowRight } from 'lucide-react';
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

    // Premium dark blue gradient
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#0d2847');
    gradient.addColorStop(1, '#061220');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle light effects
    ctx.fillStyle = 'rgba(30,120,200,0.08)';
    ctx.beginPath();
    ctx.arc(800, 400, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(30,120,200,0.05)';
    ctx.beginPath();
    ctx.arc(200, 1400, 500, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ÍNDICE DO QUINTAL', 540, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px Inter, sans-serif';
    ctx.fillText('SPLASH PISCINAS', 540, 250);

    // Score ring
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

    // Score text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 110px Inter, sans-serif';
    ctx.fillText(`${score}%`, 540, 610);
    ctx.font = '400 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('de potencial', 540, 660);

    // Main text
    ctx.font = '700 46px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ['Meu quintal tem', `${score}% de potencial para`, 'uma piscina Splash!']
      .forEach((line, i) => ctx.fillText(line, 540, 870 + i * 65));

    // Badge
    const badgeY = 1120;
    ctx.fillStyle = 'rgba(30,136,229,0.15)';
    ctx.beginPath();
    ctx.roundRect(220, badgeY - 28, 640, 56, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,136,229,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '600 28px Inter, sans-serif';
    ctx.fillStyle = '#64b5f6';
    ctx.fillText(`🏆 ${ranking.label}`, 540, badgeY + 8);

    // Model
    ctx.font = '400 30px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Modelo recomendado: ${poolName}`, 540, 1300);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(340, 1400);
    ctx.lineTo(740, 1400);
    ctx.stroke();

    // CTA
    ctx.font = '500 26px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Descubra o potencial do seu quintal em', 540, 1490);
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('splashpiscinas.com.br', 540, 1535);

    // Footer
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col items-center px-6 py-12 gradient-hero"
    >
      <div className="w-full max-w-md text-center">
        <img src={logoSplash} alt="Splash Piscinas" className="mx-auto w-28 mb-6 opacity-80" />

        <h2 className="text-2xl font-bold mb-2 tracking-tight text-foreground">
          {leadName ? `Parabéns, ${leadName.split(' ')[0]}!` : 'Parabéns!'} 🎉
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          Seu quintal tem <strong className="text-primary font-semibold">{score}%</strong> de potencial para a piscina <strong className="font-semibold">{poolName}</strong>.
        </p>

        <div className="inline-flex items-center gap-2 my-4 px-4 py-2 rounded-full bg-primary/8 border border-primary/15">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="font-semibold text-xs text-primary">{ranking.label}</span>
        </div>

        {poolDescription && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{poolDescription}</p>
        )}

        <ValorizationSimulator score={score} />

        {refCode && (
          <FriendChallenge refCode={refCode} score={score} leadName={leadName} />
        )}

        <div className="space-y-3 mt-6">
          {/* Primary CTA */}
          <Button
            onClick={handleWhatsApp}
            className="w-full py-6 text-base rounded-2xl font-semibold gradient-blue hover:opacity-90 transition-all gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Falar com especialista
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* Secondary */}
          <Button
            variant="outline"
            className="w-full py-6 text-base rounded-2xl font-semibold border-border hover:bg-accent transition-all"
          >
            <FileText className="w-5 h-5 mr-2" />
            Receber estimativa
          </Button>

          {/* Tertiary actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-5 text-sm rounded-2xl font-medium text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              {sharing ? 'Gerando...' : 'Compartilhar'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDownload}
              className="flex-1 py-5 text-sm rounded-2xl font-medium text-muted-foreground hover:text-foreground"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Baixar imagem
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
