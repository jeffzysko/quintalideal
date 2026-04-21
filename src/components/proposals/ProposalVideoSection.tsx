import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Video } from 'lucide-react';

interface Props {
  videoUrl: string;
  onChange: (url: string) => void;
}

export function ProposalVideoSection({ videoUrl, onChange }: Props) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          Vídeo de Apresentação
          <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="text-sm text-muted-foreground">Link do YouTube, Loom ou vídeo externo</Label>
        <Input
          value={videoUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=... ou https://loom.com/share/..."
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          💡 Propostas com vídeo de apresentação têm taxa de aceite significativamente maior.
        </p>
      </CardContent>
    </Card>
  );
}

// Embed helper for public page
export function VideoEmbed({ url }: { url: string }) {
  const getEmbedUrl = (raw: string): string | null => {
    try {
      // YouTube
      const ytMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
      // Loom
      const loomMatch = raw.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
      if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
      // Direct video or other iframe-able URL
      if (raw.match(/\.(mp4|webm)$/i)) return raw;
      return null;
    } catch { return null; }
  };

  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;

  if (embedUrl.match(/\.(mp4|webm)$/i)) {
    return (
      <div className="rounded-xl overflow-hidden bg-black">
        <video controls className="w-full max-h-[400px]" src={embedUrl} />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden aspect-video">
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Vídeo de apresentação"
      />
    </div>
  );
}
