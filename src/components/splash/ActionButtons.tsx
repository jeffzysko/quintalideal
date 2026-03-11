import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MessageCircle, FileText, Share2 } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';

interface ActionButtonsProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  whatsappNumber?: string;
  leadName?: string;
}

export function ActionButtons({ score, poolName, poolDescription, whatsappNumber, leadName }: ActionButtonsProps) {
  const handleWhatsApp = () => {
    const phone = whatsappNumber || '5551999999999';
    const message = encodeURIComponent(
      `Olá! Fiz o teste do Índice do Quintal Splash e meu quintal tem ${score}% de potencial. O modelo recomendado foi a ${poolName}. Gostaria de saber mais!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleShare = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient using brand colors
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#e80685');
    gradient.addColorStop(0.5, '#08a1d6');
    gradient.addColorStop(1, '#08a1d6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Overlay for readability
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, 1080, 1920);

    // Circle bg
    ctx.beginPath();
    ctx.arc(540, 700, 200, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 20;
    ctx.stroke();

    // Score arc
    ctx.beginPath();
    ctx.arc(540, 700, 200, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}%`, 540, 730);

    ctx.font = 'bold 48px Montserrat, sans-serif';
    ctx.fillText('Meu quintal tem', 540, 1050);
    ctx.fillText(`${score}% de potencial`, 540, 1120);
    ctx.fillText('para uma piscina Splash!', 540, 1190);

    ctx.font = '36px Open Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`Modelo recomendado: ${poolName}`, 540, 1300);

    ctx.font = 'bold 28px Montserrat, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('splashpiscinas.com.br', 540, 1800);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
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
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
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
        {poolDescription && (
          <p className="text-sm text-muted-foreground mb-8">{poolDescription}</p>
        )}

        <div className="space-y-3">
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

          <Button
            variant="ghost"
            onClick={handleShare}
            className="w-full py-6 text-base rounded-full font-bold text-muted-foreground"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Compartilhar meu resultado
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
