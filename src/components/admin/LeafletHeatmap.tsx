import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cityCoordinates } from '@/lib/cityCoordinates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Filter, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Import leaflet.heat side-effect
import 'leaflet.heat';

interface CityLead {
  cidade: string | null;
  pontuacao_quintal: number | null;
  franquia_id?: string | null;
}

interface CoveredCity {
  city_name: string;
  franchise_id: string;
}

interface LeafletHeatmapProps {
  leads: CityLead[];
  coveredCities?: CoveredCity[];
  franchiseMap?: Record<string, string>;
  className?: string;
}

type HeatMode = 'volume' | 'score';
type MapLayer = 'heat' | 'markers';

export function LeafletHeatmap({ leads, coveredCities = [], franchiseMap = {}, className = '' }: LeafletHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [heatMode, setHeatMode] = useState<HeatMode>('volume');
  const [mapLayer, setMapLayer] = useState<MapLayer>('heat');

  // Aggregate city data
  const cityData = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number; franchiseIds: Set<string> }> = {};
    leads.forEach(l => {
      if (!l.cidade) return;
      if (!map[l.cidade]) map[l.cidade] = { count: 0, totalScore: 0, franchiseIds: new Set() };
      map[l.cidade].count++;
      map[l.cidade].totalScore += l.pontuacao_quintal || 0;
      if (l.franquia_id) map[l.cidade].franchiseIds.add(l.franquia_id);
    });
    return map;
  }, [leads]);

  // Covered cities set
  const coveredSet = useMemo(() => {
    const s = new Set<string>();
    coveredCities.forEach(c => s.add(c.city_name.toLowerCase()));
    return s;
  }, [coveredCities]);

  // Uncovered cities with leads
  const uncoveredCities = useMemo(() => {
    return Object.keys(cityData).filter(city => !coveredSet.has(city.toLowerCase()));
  }, [cityData, coveredSet]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [-29.5, -52.5],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Add attribution in corner
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://carto.com">CARTO</a>')
      .addTo(map);

    mapInstance.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update layers when data/mode changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing layers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    const maxCount = Math.max(...Object.values(cityData).map(d => d.count), 1);
    const maxAvg = Math.max(...Object.values(cityData).map(d => d.count > 0 ? d.totalScore / d.count : 0), 1);

    if (mapLayer === 'heat') {
      // Build heat points
      const heatPoints: [number, number, number][] = [];
      Object.entries(cityData).forEach(([city, data]) => {
        const coords = cityCoordinates[city];
        if (!coords) return;
        const intensity = heatMode === 'volume'
          ? data.count / maxCount
          : (data.totalScore / data.count) / maxAvg;
        // Add multiple points for higher intensity
        const repetitions = Math.max(1, Math.ceil(intensity * 5));
        for (let i = 0; i < repetitions; i++) {
          heatPoints.push([coords[0], coords[1], intensity]);
        }
      });

      if (heatPoints.length > 0) {
        heatLayerRef.current = (L as any).heatLayer(heatPoints, {
          radius: 35,
          blur: 25,
          maxZoom: 10,
          max: 1,
          gradient: heatMode === 'volume'
            ? { 0.2: '#3b82f6', 0.4: '#06b6d4', 0.6: '#eab308', 0.8: '#f97316', 1: '#ef4444' }
            : { 0.2: '#ef4444', 0.4: '#f97316', 0.6: '#eab308', 0.8: '#22c55e', 1: '#10b981' },
        }).addTo(map);
      }
    }

    // Always add markers for city info
    Object.entries(cityData).forEach(([city, data]) => {
      const coords = cityCoordinates[city];
      if (!coords) return;
      const avg = Math.round(data.totalScore / data.count);
      const isCovered = coveredSet.has(city.toLowerCase());
      const isUncovered = !isCovered;

      const size = Math.max(8, Math.min(24, (data.count / maxCount) * 24));

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${isUncovered ? '#ef4444' : 'hsl(207, 90%, 54%)'};
          border:2px solid ${isUncovered ? '#fca5a5' : '#93c5fd'};
          opacity:${mapLayer === 'markers' ? 0.9 : 0.7};
          box-shadow:0 0 ${size}px ${isUncovered ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'};
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(coords, { icon });
      const franchiseNames = Array.from(data.franchiseIds).map(id => franchiseMap[id] || 'Desconhecida').join(', ');

      marker.bindPopup(`
        <div style="font-family:system-ui;font-size:13px;min-width:160px;">
          <strong style="font-size:14px;">${city}</strong>
          ${isUncovered ? '<span style="color:#ef4444;font-size:11px;"> ⚠️ Sem cobertura</span>' : ''}
          <hr style="margin:6px 0;border-color:#e5e7eb;"/>
          <div style="display:grid;gap:4px;">
            <div>📊 <strong>${data.count}</strong> lead${data.count > 1 ? 's' : ''}</div>
            <div>⭐ Média: <strong>${avg}%</strong></div>
            ${franchiseNames ? `<div>🏢 ${franchiseNames}</div>` : ''}
          </div>
        </div>
      `, { closeButton: false });

      markersLayerRef.current?.addLayer(marker);
    });

    // Add uncovered cities without leads from coverage
  }, [cityData, heatMode, mapLayer, coveredSet, franchiseMap]);

  return (
    <Card className={`card-premium overflow-visible border-border/40 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap relative z-[1000]">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="w-4 h-4 text-destructive" /> Mapa Geográfico de Leads
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          {uncoveredCities.length > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              {uncoveredCities.length} cidade{uncoveredCities.length > 1 ? 's' : ''} sem cobertura
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={mapLayer} onValueChange={(v) => setMapLayer(v as MapLayer)}>
              <SelectTrigger className="w-28 h-8 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
                <SelectItem value="heat">Heatmap</SelectItem>
                <SelectItem value="markers">Marcadores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={heatMode} onValueChange={(v) => setHeatMode(v as HeatMode)}>
              <SelectTrigger className="w-28 h-8 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="score">Potencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-xl">
        <div ref={mapRef} className="w-full h-[400px] md:h-[500px]" style={{ zIndex: 0 }} />
        {/* Legend */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 text-xs text-muted-foreground border-t border-border/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Com cobertura
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" /> Sem cobertura
            </span>
          </div>
          <span>{Object.keys(cityData).length} cidades · {leads.filter(l => l.cidade).length} leads</span>
        </div>
      </CardContent>
    </Card>
  );
}
