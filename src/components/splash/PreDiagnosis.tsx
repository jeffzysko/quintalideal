import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, Ruler, TreePine, Sparkles } from 'lucide-react';
import logoSplash from '@/assets/logo-quintal-ideal.png';
import { type Lang, t } from '@/lib/i18n';

interface PreDiagnosisProps {
  onContinue: () => void;
  lang?: Lang;
}

export function PreDiagnosis({ onContinue, lang = 'pt' }: PreDiagnosisProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d3060 40%, #0a2445 100%)' }}
    >
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, hsl(207 90% 50%), transparent 65%)' }}
      />

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', damping: 18 }}
        className="text-center max-w-md w-full relative z-10"
      >
        <motion.img
          src={logoSplash}
          alt="Splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.1 }}
          className="mx-auto w-20 mb-8"
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(30,136,229,0.15)', border: '1px solid rgba(30,136,229,0.2)' }}
          >
            <Search className="w-7 h-7 text-blue-400" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            {t('prediag_title', lang)}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {t('prediag_subtitle_1', lang)}{' '}
            <span className="text-blue-300 font-bold">72% e 91%</span> {t('prediag_subtitle_2', lang)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-left space-y-3 mb-8 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold mb-3">
            {t('prediag_still_need', lang)}
          </p>
          {[
            { icon: Ruler, text: t('prediag_item_1', lang) },
            { icon: TreePine, text: t('prediag_item_2', lang) },
            { icon: Sparkles, text: t('prediag_item_3', lang) },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(30,136,229,0.1)' }}
              >
                <item.icon className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-white/60 text-sm">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={onContinue}
            className="w-full py-7 text-[15px] rounded-2xl font-bold gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.01] transition-all duration-300 gap-2"
          >
            {t('prediag_cta', lang)}
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </Button>
          <p className="text-white/25 text-[10px] mt-2">
            {t('prediag_hint', lang)}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
