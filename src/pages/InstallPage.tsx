import { usePWA } from '@/hooks/usePWA';
import { motion } from 'framer-motion';
import { Download, Check, Share, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageTransition } from '@/components/PageTransition';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function IOSInstructions() {
  return (
    <Card className="card-premium">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-base font-bold text-foreground">Como instalar no iPhone/iPad</h3>
        <div className="space-y-3">
          {[
            { step: 1, icon: Share, text: 'Toque no botão de compartilhamento na barra do Safari' },
            { step: 2, icon: Plus, text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
            { step: 3, icon: Check, text: 'Confirme tocando em "Adicionar"' },
          ].map(({ step, icon: Icon, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                {step}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AndroidInstructions() {
  return (
    <Card className="card-premium">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-base font-bold text-foreground">Como instalar no Android</h3>
        <div className="space-y-3">
          {[
            { step: 1, icon: MoreVertical, text: 'Toque no menu ⋮ do navegador (canto superior direito)' },
            { step: 2, icon: Download, text: 'Toque em "Instalar app" ou "Adicionar à tela inicial"' },
            { step: 3, icon: Check, text: 'Confirme a instalação' },
          ].map(({ step, icon: Icon, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                {step}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InstallPage() {
  const { canInstall, promptInstall, isInstalled, isStandalone } = usePWA();

  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="flex-1 max-w-lg mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <img
              src={logoQuintalIdeal}
              alt="Quintal Ideal"
              className="w-44 mx-auto mb-4"
            />
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
              Instalar Quintal Ideal
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Adicione à tela inicial do seu celular para acesso rápido. Funciona como um app nativo — sem precisar baixar pela loja.
            </p>
          </motion.div>

          {isInstalled || isStandalone ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className="card-premium border-emerald-500/20">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">App instalado!</h3>
                  <p className="text-sm text-muted-foreground">
                    O Quintal Ideal já está na sua tela inicial. Abra-o de lá para a melhor experiência.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full space-y-4"
            >
              {canInstall && (
                <Button
                  size="lg"
                  onClick={promptInstall}
                  className="w-full rounded-2xl gap-2 text-base h-14 shadow-lg shadow-primary/20"
                >
                  <Download className="w-5 h-5" />
                  Instalar agora
                </Button>
              )}

              {isIOS() ? <IOSInstructions /> : <AndroidInstructions />}

              {/* Benefits */}
              <Card className="card-premium">
                <CardContent className="p-5">
                  <h3 className="text-base font-bold text-foreground mb-3">Por que instalar?</h3>
                  <div className="space-y-2.5">
                    {[
                      { emoji: '⚡', text: 'Abre instantaneamente, sem carregar o navegador' },
                      { emoji: '📱', text: 'Experiência de app nativo na tela cheia' },
                      { emoji: '🔔', text: 'Preparado para notificações futuras' },
                      { emoji: '🔒', text: 'Seguro e sempre atualizado automaticamente' },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-lg">{b.emoji}</span>
                        <p className="text-sm text-foreground">{b.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
