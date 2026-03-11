import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Droplets, Shield, MapPin, Phone, ArrowRight } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';
import heroPool from '@/assets/hero-pool.jpg';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroPool} alt="Piscina Splash" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(8,20,40,0.5) 0%, rgba(8,20,40,0.3) 40%, rgba(8,20,40,0.85) 100%)'
          }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
          <motion.img
            src={logoSplash}
            alt="Splash Piscinas"
            className="h-16 md:h-20 mb-6 drop-shadow-xl"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          />
          <motion.h1
            className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Transforme seu quintal em um <span className="text-primary">paraíso</span>
          </motion.h1>
          <motion.p
            className="text-white/80 text-base md:text-lg mb-8 max-w-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Piscinas de fibra com qualidade premium, entregues e instaladas pela franquia mais perto de você.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              size="lg"
              className="rounded-2xl px-8 py-6 text-base font-bold shadow-xl gap-2"
              onClick={() => {
                const el = document.getElementById('como-funciona');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Saiba mais <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="como-funciona" className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Por que escolher a Splash?</h2>
          <p className="text-muted-foreground">Qualidade, tecnologia e atendimento local.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { icon: Droplets, title: 'Fibra Premium', desc: 'Piscinas fabricadas com fibra de alta resistência e acabamento impecável.' },
            { icon: Shield, title: 'Garantia de Fábrica', desc: 'Garantia direto da fábrica com suporte da franquia local.' },
            { icon: MapPin, title: 'Franquia Local', desc: 'Atendimento personalizado com um consultor na sua região.' },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-accent/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Encontre a franquia mais perto de você</h2>
          <p className="text-muted-foreground mb-8">
            Entre em contato com uma de nossas franquias para fazer o teste do quintal e receber um orçamento personalizado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="rounded-2xl px-8 py-6 text-base font-bold gap-2"
              onClick={() => navigate('/login')}
            >
              Área do Franqueado <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 py-6 text-base font-bold gap-2"
              onClick={() => window.open('https://wa.me/555199999999', '_blank')}
            >
              <Phone className="w-4 h-4" /> Fale Conosco
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoSplash} alt="Splash Piscinas" className="h-8 opacity-60" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Splash Piscinas. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
