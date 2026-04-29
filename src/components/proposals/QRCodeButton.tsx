import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, DownloadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface QRCodeButtonProps {
  url: string;
}

export function QRCodeButton({ url }: QRCodeButtonProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeUrl(dataUrl);
    } catch (err) {
      console.error('QR Code generation error:', err);
      toast.error('Erro ao gerar QR Code');
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'proposta-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog onOpenChange={(open) => open && generateQRCode()}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-10">
          <QrCode className="w-3.5 h-3.5" /> QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code da Proposta</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-border/50">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 object-contain" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted animate-pulse rounded-lg">
                Gerando...
              </div>
            )}
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-foreground">Aponte a câmera do celular para o código</p>
            <p className="text-xs text-muted-foreground">Mostre este QR Code para o cliente escanear e abrir a proposta na hora.</p>
          </div>
          {qrCodeUrl && (
            <Button onClick={downloadQRCode} className="w-full gap-2">
              <DownloadCloud className="w-4 h-4" /> Baixar QR Code
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
