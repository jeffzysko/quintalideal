import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, BarChart3, Users, TrendingUp } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface CityData {
  cidade: string;
  count: number;
  avgScore: number;
}

// RS cities approximate positions (normalized 0-100 on a simplified RS map)
const cityPositions: Record<string, { x: number; y: number }> = {
  'Porto Alegre': { x: 68, y: 72 },
  'Caxias do Sul': { x: 60, y: 42 },
  'Pelotas': { x: 58, y: 92 },
  'Santa Maria': { x: 38, y: 58 },
  'Passo Fundo': { x: 52, y: 22 },
  'Canoas': { x: 66, y: 70 },
  'Novo Hamburgo': { x: 64, y: 62 },
  'São Leopoldo': { x: 65, y: 63 },
  'Rio Grande': { x: 60, y: 95 },
  'Viamão': { x: 70, y: 74 },
  'Gravataí': { x: 67, y: 68 },
  'Uruguaiana': { x: 8, y: 60 },
  'Santa Cruz do Sul': { x: 48, y: 55 },
  'Bagé': { x: 32, y: 85 },
  'Bento Gonçalves': { x: 58, y: 40 },
  'Erechim': { x: 55, y: 15 },
  'Lajeado': { x: 52, y: 50 },
  'Cruz Alta': { x: 38, y: 35 },
  'Ijuí': { x: 35, y: 30 },
  'Santo Ângelo': { x: 25, y: 30 },
  'Cachoeirinha': { x: 67, y: 69 },
  'Sapucaia do Sul': { x: 66, y: 67 },
  'Alvorada': { x: 69, y: 71 },
  'Guaíba': { x: 65, y: 75 },
  'Sapiranga': { x: 62, y: 58 },
  'Farroupilha': { x: 57, y: 41 },
  'Tramandaí': { x: 78, y: 68 },
  'Torres': { x: 82, y: 48 },
  'Capão da Canoa': { x: 80, y: 55 },
};

export default function MapaQuintais() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<{ cidade: string | null; pontuacao_quintal: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('leads')
      .select('cidade, pontuacao_quintal');
    setLeads(data || []);
    setLoading(false);
  };

  const cityData = useMemo((): CityData[] => {
    const map: Record<string, { count: number; total: number }> = {};
    leads.forEach(l => {
      if (!l.cidade) return;
      if (!map[l.cidade]) map[l.cidade] = { count: 0, total: 0 };
      map[l.cidade].count++;
      map[l.cidade].total += l.pontuacao_quintal || 0;
    });
    return Object.entries(map)
      .map(([cidade, d]) => ({ cidade, count: d.count, avgScore: Math.round(d.total / d.count) }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalQuintais = leads.filter(l => l.cidade).length;
  const avgGeral = totalQuintais > 0
    ? Math.round(leads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalQuintais)
    : 0;
  const topCities = cityData.slice(0, 10);

  // Get max count for bubble sizing
  const maxCount = Math.max(...cityData.map(c => c.count), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <img src={logoSplash} alt="Splash" className="w-20" />
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Montserrat' }}>
              Mapa dos Quintais
            </h1>
            <p className="text-xs text-muted-foreground">Rio Grande do Sul</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          Fazer o teste
        </Button>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{totalQuintais}</p>
              <p className="text-xs text-muted-foreground">Quintais analisados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="w-6 h-6 text-secondary mx-auto mb-1" />
              <p className="text-2xl font-bold">{cityData.length}</p>
              <p className="text-xs text-muted-foreground">Cidades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{avgGeral}%</p>
              <p className="text-xs text-muted-foreground">Média geral</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Visual Map */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Mapa de Quintais Analisados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-[4/3] bg-accent/20 rounded-xl overflow-hidden border">
                  {/* RS outline (simplified) */}
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 opacity-10">
                    <path
                      d="M 15,5 L 85,5 L 90,15 L 88,30 L 82,45 L 85,55 L 80,65 L 75,72 L 70,78 L 60,95 L 55,98 L 45,95 L 30,88 L 20,80 L 10,65 L 5,50 L 8,35 L 10,20 L 12,10 Z"
                      fill="hsl(var(--secondary))"
                      stroke="hsl(var(--secondary))"
                      strokeWidth="0.5"
                    />
                  </svg>

                  {/* City bubbles */}
                  {cityData.map(city => {
                    const pos = cityPositions[city.cidade];
                    if (!pos) return null;
                    const size = Math.max(12, Math.min(40, (city.count / maxCount) * 40));
                    return (
                      <motion.div
                        key={city.cidade}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: Math.random() * 0.5 }}
                        className="absolute flex items-center justify-center"
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: size,
                          height: size,
                        }}
                        title={`${city.cidade}: ${city.count} quintais, média ${city.avgScore}%`}
                      >
                        <div
                          className="rounded-full bg-primary/70 border-2 border-primary shadow-lg cursor-pointer hover:bg-primary transition-colors"
                          style={{ width: '100%', height: '100%' }}
                        />
                        {size >= 20 && (
                          <span className="absolute text-[8px] font-bold text-primary-foreground pointer-events-none">
                            {city.count}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Cada bolha representa uma cidade — tamanho proporcional ao número de quintais analisados.
                </p>
              </CardContent>
            </Card>

            {/* City ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Ranking de Cidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topCities.map((city, i) => (
                    <div key={city.cidade} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}º</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{city.cidade}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{city.count} {city.count === 1 ? 'quintal' : 'quintais'}</span>
                          <span>Média: {city.avgScore}%</span>
                        </div>
                      </div>
                      <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(city.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {topCities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum quintal analisado ainda. Seja o primeiro!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
