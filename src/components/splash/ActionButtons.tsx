import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Trophy, ArrowRight, Sparkles, Ruler, Waves, Droplets, Users, Instagram, X, MapPin } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';
import { getRankingGaucho, getYardClassification, getSharePhrase, getSocialComparison } from '@/lib/ranking';
import { getPoolImage } from '@/lib/poolImages';
import { ValorizationSimulator } from './ValorizationSimulator';
import { trackEvent } from '@/lib/analytics';
import { trackMetaEvent } from '@/components/MetaPixel';
import { SITE_URL, SITE_DOMAIN } from '@/lib/constants';
import { type Lang, t } from '@/lib/i18n';

import { type FitLevel, getFitLevelLabel, getFitLevelEmoji } from '@/lib/scoring-v2';

interface PoolSpecs {
  tamanho?: string;
  profundidade?: number;
  possui_prainha?: boolean;
  possui_spa?: boolean;
}

interface PoolAlternativeView {
  name: string;
  image?: string;
  description?: string;
  fitLevel?: FitLevel;
  matchScore?: number;
  specs?: {
    tamanho?: string;
    profundidade?: number;
    possui_prainha?: boolean;
    possui_spa?: boolean;
  };
}

interface UpgradeOptionView {
  name: string;
  image?: string;
  description?: string;
  fitLevel?: FitLevel;
  matchScore?: number;
  recommendedSize?: string;
}

interface ActionButtonsProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  poolSpecs?: PoolSpecs | null;
  recommendedSize?: string;
  whatsappNumber?: string;
  assignedFranchiseName?: string;
  assignedCidadeBase?: string;
  leadName?: string;
  refCode?: string;
  franchiseId?: string;
  alternatives?: PoolAlternativeView[];
  fitLevel?: FitLevel;
  matchScore?: number;
  reasoning?: string;
  customerProfile?: string;
  upgradeOption?: UpgradeOptionView;
  lang?: Lang;
}

export function ActionButtons({ score, poolName, poolDescription, poolSpecs, recommendedSize, whatsappNumber, assignedFranchiseName, assignedCidadeBase, leadName, refCode: _refCode, franchiseId, alternatives = [], lang = 'pt' }: ActionButtonsProps) {
  const ranking = getRankingGaucho(score);
  const classification = getYardClassification(score);
  const socialComparison = getSocialComparison(score);
  
  const [showInstaGuide, setShowInstaGuide] = useState(false);

  const handleInstagramShare = async () => {
    trackEvent('result_shared', { franchiseId, metadata: { plataforma: 'instagram_stories' } });
    const blob = await generateShareImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meu-quintal-splash-${score}pct.png`;
    a.click();
    URL.revokeObjectURL(url);
    setShowInstaGuide(true);
  };

  const handleWhatsApp = () => {
    trackEvent('whatsapp_clicked', { franchiseId });
    trackMetaEvent('Contact', {
      content_name: poolName,
      content_category: 'whatsapp',
    });
    const phone = whatsappNumber || '5551999999999';
    const message = encodeURIComponent(
      t('wa_message', lang)
        .replace('{score}', String(score))
        .replace('{label}', classification.label)
        .replace('{pool}', poolName)
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    trackEvent('result_shared', { franchiseId, metadata: { plataforma: 'whatsapp' } });
    const phrase = getSharePhrase(score);
    const siteUrl = SITE_URL;
    const text = encodeURIComponent(
      `${phrase}\n\n${classification.emoji} ${classification.label}\n🏊 ${t('action_rec_label', lang)}: ${poolName}\n\n${siteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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

    ctx.beginPath(); ctx.arc(540, 560, 195, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath(); ctx.arc(540, 560, 195, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.font = '900 110px Inter, sans-serif';
    ctx.fillText(`${score}%`, 540, 590);
    ctx.font = '400 24px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('de potencial', 540, 640);

    ctx.font = '700 42px Inter, sans-serif'; ctx.fillStyle = classification.color;
    ctx.fillText(`${classification.emoji} ${classification.label}`, 540, 830);

    ctx.font = '700 44px Inter, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText(`Meu quintal tem ${score}%`, 540, 950);
    ctx.fillText('de potencial para', 540, 1010);
    ctx.fillText('uma piscina Splash!', 540, 1070);

    const badgeY = 1150;
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.beginPath(); ctx.roundRect(180, badgeY - 28, 720, 56, 28); ctx.fill();
    ctx.font = '600 26px Inter, sans-serif'; ctx.fillStyle = '#ffd700';
    ctx.fillText(`🏆 ${ranking.label}`, 540, badgeY + 8);

    const poolImgSrc = getPoolImage(poolName);
    if (poolImgSrc) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = poolImgSrc;
        });
        const imgX = 140, imgY = 1210, imgW = 800, imgH = 360, radius = 24;
        ctx.save();
        ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, radius); ctx.clip();
        const scale = Math.max(imgW / img.width, imgH / img.height);
        const sw = imgW / scale, sh = imgH / scale;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, radius); ctx.stroke();
      } catch { /* skip */ }
    }

    ctx.font = '400 28px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(`${t('action_rec_label', lang)}: ${poolName}`, 540, 1620);

    ctx.font = '400 24px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(socialComparison, 540, 1670);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(340, 1720); ctx.lineTo(740, 1720); ctx.stroke();

    ctx.font = '500 24px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Descubra o potencial do seu quintal em', 540, 1770);
    ctx.font = '700 28px Inter, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText(SITE_DOMAIN, 540, 1810);

    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 1860, 1080, 60);
    ctx.font = '400 18px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('© Splash Piscinas', 540, 1895);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };

  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (score / 100) * circumference;
  const firstName = leadName?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background">
      {/* === COMPACT HEADER === */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #06101f 0%, #0b2a52 35%, #0d3468 60%, #081d38 100%)' }}
      >
        <div className="relative z-10 px-4 sm:px-6 pt-5 sm:pt-8 pb-4 sm:pb-6 max-w-md mx-auto text-center">
          <motion.img
            src={logoSplash}
            alt="Splash Piscinas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="mx-auto w-12 sm:w-14 mb-2 sm:mb-3"
          />

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white text-base sm:text-lg md:text-xl font-extrabold tracking-tight mb-3 sm:mb-4"
          >
            {firstName ? `${firstName}, ${t('action_header_suffix', lang)}` : (lang === 'es' ? 'Tu patio es' : 'Seu quintal é')}{' '}
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">{t('action_header_amazing', lang)}</span>! 🎉
          </motion.h1>

          {/* Score + badges row */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35, type: 'spring', damping: 14 }}
            className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4"
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
                <circle cx="50" cy="50" r="46"
                  stroke="url(#actionGrad)" strokeWidth="5" fill="none" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(30,136,229,0.6))' }}
                />
                <defs>
                  <linearGradient id="actionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e88e5" />
                    <stop offset="100%" stopColor="#00e5ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className="text-xl sm:text-2xl font-black text-white">{score}</span>
                <span className="text-[7px] sm:text-[8px] font-medium text-white/50">{t('result_points', lang)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 sm:gap-1.5">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${classification.color}18, ${classification.color}08)`,
                  border: `1px solid ${classification.color}30`,
                }}
              >
                <span className="text-xs sm:text-sm">{classification.emoji}</span>
                <span className="font-bold text-[10px] sm:text-[11px]" style={{ color: classification.color }}>{classification.label}</span>
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))',
                  border: '1px solid rgba(255,215,0,0.2)',
                }}
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="font-bold text-[10px] sm:text-[11px] text-amber-300">{ranking.label}</span>
              </div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/45 text-[10px] sm:text-[11px] italic"
          >
            {socialComparison}
          </motion.p>
        </div>
      </motion.div>

      {/* === POOL CARD === */}
      <div className="px-3 sm:px-6 max-w-md mx-auto -mt-3 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg"
        >
          {getPoolImage(poolName) && (
            <div className="aspect-[16/9] w-full overflow-hidden">
              <img
                src={getPoolImage(poolName)}
                alt={`Piscina ${poolName}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-[0.15em]">{t('action_rec_label', lang)}</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">{poolName}</h3>
            {poolDescription && <p className="text-xs text-muted-foreground leading-relaxed mb-4">{poolDescription}</p>}

            {poolSpecs && (
              <div className="grid grid-cols-2 gap-2">
                {recommendedSize && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
                    <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{t('action_size', lang)}</p>
                      <p className="text-xs font-semibold text-foreground">{recommendedSize}</p>
                    </div>
                  </div>
                )}
                {poolSpecs.profundidade && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
                    <Waves className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{t('action_depth', lang)}</p>
                      <p className="text-xs font-semibold text-foreground">{poolSpecs.profundidade}m</p>
                    </div>
                  </div>
                )}
                {poolSpecs.possui_prainha && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
                    <span className="text-sm">🏖️</span>
                    <p className="text-xs font-semibold text-foreground">{t('action_beach', lang)}</p>
                  </div>
                )}
                {poolSpecs.possui_spa && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
                    <Droplets className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-xs font-semibold text-foreground">{t('action_spa', lang)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-4"
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              {lang === 'es' ? 'También pueden gustarte' : 'Você também pode gostar'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {alternatives.map((alt, i) => (
                <motion.div
                  key={alt.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="rounded-xl overflow-hidden border border-border bg-card"
                >
                  {alt.image && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={alt.image} alt={alt.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{alt.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {alt.specs?.tamanho && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          📐 {alt.specs.tamanho}
                        </span>
                      )}
                      {alt.specs?.possui_prainha && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">🏖️ Prainha</span>
                      )}
                      {alt.specs?.possui_spa && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">💆 Hidro</span>
                      )}
                      {alt.specs?.profundidade && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          ↕ {alt.specs.profundidade}m
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Assigned franchise info */}
        {assignedFranchiseName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-5 rounded-2xl p-4 text-center border border-primary/20 bg-primary/5"
          >
            <MapPin className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground mb-0.5">
              {lang === 'es' ? 'Un especialista de tu región puede ayudarte ahora' : 'Um especialista da Splash da sua região pode te ajudar agora'}
            </p>
            <p className="text-sm font-bold text-foreground">{assignedFranchiseName}</p>
            {assignedCidadeBase && <p className="text-xs text-muted-foreground">{assignedCidadeBase}</p>}
          </motion.div>
        )}

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-5"
        >
          <Button
            onClick={handleWhatsApp}
            className="w-full py-7 text-[15px] rounded-2xl font-bold shadow-xl shadow-primary/25 gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.01] transition-all duration-300 gap-2 group"
          >
            <MessageCircle className="w-5 h-5" />
            {t('action_whatsapp_cta', lang)}
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            {t('action_whatsapp_hint', lang)}
          </p>
        </motion.div>

        {/* Valorization Simulator */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          <ValorizationSimulator score={score} lang={lang} />
        </motion.div>

        {/* Challenge CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-5 rounded-2xl p-5 text-center"
          style={{
            background: 'linear-gradient(135deg, hsl(207 90% 54% / 0.08), hsl(180 100% 50% / 0.04))',
            border: '1px solid hsl(207 90% 54% / 0.15)',
          }}
        >
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {t('action_challenge_title', lang)}
          </p>
          <p className="text-xs text-muted-foreground mb-3">{t('action_challenge_subtitle', lang)}</p>
          <Button
            variant="outline"
            onClick={handleShareWhatsApp}
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {t('action_challenge_btn', lang)}
          </Button>
        </motion.div>

        {/* Share row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="space-y-3 mt-6 pb-14"
        >
          <div className="grid grid-cols-2 gap-2">
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
              onClick={handleInstagramShare}
              className="py-5 text-xs rounded-2xl font-medium border-border hover:bg-accent gap-1.5 flex-col h-auto"
            >
              <Instagram className="w-4 h-4 text-pink-500" />
              {t('action_share_insta', lang)}
            </Button>
          </div>

          {/* Trust footer */}
          <div className="text-center pt-4 space-y-2">
            <img src={logoSplash} alt="Splash" className="mx-auto w-16 opacity-30" />
            <p className="text-[10px] text-muted-foreground/50">
              {t('action_footer', lang)}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Instagram Stories Guide Modal */}
      <AnimatePresence>
        {showInstaGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInstaGuide(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  <h3 className="font-bold text-foreground text-base">{t('action_insta_guide_title', lang)}</h3>
                </div>
                <button onClick={() => setShowInstaGuide(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-5">
                {t('action_insta_saved', lang)}
              </p>

              <div className="space-y-4">
                {[
                  t('action_insta_step1', lang),
                  t('action_insta_step2', lang),
                  t('action_insta_step3', lang),
                  t('action_insta_step4', lang),
                ].map((stepText, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: stepText }} />
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowInstaGuide(false)}
                className="w-full mt-6 py-6 rounded-2xl font-bold gradient-blue"
              >
                {t('action_insta_ok', lang)}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
