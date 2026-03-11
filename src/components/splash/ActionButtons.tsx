import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MessageCircle, FileText, Share2, Trophy, Download } from 'lucide-react';
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
    gradient.addColorStop(0, '#e80685');
    gradient.addColorStop(0.4, '#c2066e');
    gradient.addColorStop(0.7, '#08a1d6');
    gradient.addColorStop(1, '#066a8f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 1080, Math.random() * 1920, Math.random() * 150 + 50, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '600 32px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ÍNDICE DO QUINTAL', 540, 180);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px Montserrat, sans-serif';
    ctx.fillText('SPLASH PISCINAS', 540, 240);

    ctx.beginPath();
    ctx.arc(540, 580, 220, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(540, 580, 195, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 22;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(540, 580, 195, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 120px Montserrat, sans-serif';
    ctx.fillText(`${score}%`, 540, 620);

    ctx.font = '500 28px Open Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('de potencial', 540, 670);

    ctx.font = '700 52px Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ['Meu quintal tem', `${score}% de potencial para`, 'uma piscina Splash!']
      .forEach((line, i) => ctx.fillText(line, 540, 880 + i * 70));

    const badgeY = 1130;
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.beginPath();
    ctx.roundRect(190, badgeY - 30, 700, 65, 32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '700 34px Montserrat, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`🏆 ${ranking.label}`, 540, badgeY + 15);

    ctx.font = '500 36px Open Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`Modelo recomendado: ${poolName}`, 540, 1300);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(340, 1400);
    ctx.lineTo(740, 1400);
    ctx.stroke();

    ctx.font = '600 30px Montserrat, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Descubra o potencial do seu quintal em', 540, 1480);
    ctx.font = '700 34px Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('splashpiscinas.com.br', 540, 1530);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 1800, 1080, 120);
    ctx.font = '500 24px Open Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('© Splash Piscinas — Feito com 💧', 540, 1870);

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
      className="min-h-screen flex flex-col items-center px-6 py-12"
      style={{
        background: 'linear-gradient(160deg, hsl(207 65% 93%) 0%, hsl(0 0% 99.6%) 40%, hsl(130 20% 92%) 100%)'
      }}
    >
      <div className="w-full max-w-md text-center">
        <img src={logoSplash} alt="Splash Piscinas" className="mx-auto w-36 mb-6" />

        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat' }}>
          {leadName ? `Parabéns, ${leadName.split(' ')[0]}!` : 'Parabéns!'} 🎉
        </h2>
        <p className="text-muted-foreground mb-2">
          Seu quintal tem <strong className="text-primary">{score}%</strong> de potencial para a piscina <strong>{poolName}</strong>.
        </p>

        <div className="flex items-center justify-center gap-2 my-3 px-4 py-2.5 rounded-full bg-primary/10 border border-primary/20 mx-auto w-fit">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-primary">{ranking.label}</span>
        </div>

        {poolDescription && (
          <p className="text-sm text-muted-foreground mb-4">{poolDescription}</p>
        )}

        <ValorizationSimulator score={score} />

        {/* Friend Challenge */}
        {refCode && (
          <FriendChallenge refCode={refCode} score={score} leadName={leadName} />
        )}

        <div className="space-y-3 mt-6">
          <Button
            onClick={handleWhatsApp}
            className="w-full py-6 text-base rounded-full font-bold bg-[#25D366] hover:bg-[#1fb855] text-white"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar com especialista
          </Button>

          <Button
            variant="outline"
            className="w-full py-6 text-base rounded-full font-bold border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
          >
            <FileText className="w-5 h-5 mr-2" />
            Receber estimativa
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-6 text-sm rounded-full font-bold text-muted-foreground"
            >
              <Share2 className="w-4 h-4 mr-1" />
              {sharing ? 'Gerando...' : 'Compartilhar'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDownload}
              className="flex-1 py-6 text-sm rounded-full font-bold text-muted-foreground"
            >
              <Download className="w-4 h-4 mr-1" />
              Baixar imagem
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
