import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download, X } from 'lucide-react';
import { isValidBRPhone, isValidEmail } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface CSVLeadImportProps {
  franchiseId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface ParsedRow {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  modelo_recomendado: string;
  observacoes: string;
  errors: string[];
  valid: boolean;
}

const EXPECTED_HEADERS = ['nome', 'telefone', 'email', 'cidade', 'modelo_recomendado', 'observacoes'];

const HEADER_ALIASES: Record<string, string> = {
  'name': 'nome',
  'phone': 'telefone',
  'tel': 'telefone',
  'celular': 'telefone',
  'whatsapp': 'telefone',
  'e-mail': 'email',
  'mail': 'email',
  'city': 'cidade',
  'municipio': 'cidade',
  'município': 'cidade',
  'modelo': 'modelo_recomendado',
  'model': 'modelo_recomendado',
  'piscina': 'modelo_recomendado',
  'obs': 'observacoes',
  'observação': 'observacoes',
  'observacao': 'observacoes',
  'notes': 'observacoes',
  'nota': 'observacoes',
};

function normalizeHeader(h: string): string {
  const clean = h.toLowerCase().trim().replace(/['"]/g, '');
  return HEADER_ALIASES[clean] || clean;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map(normalizeHeader);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

function sanitizeName(input: string): string {
  return input.replace(/[<>'"&]/g, '').trim().slice(0, 100);
}

function normalizePhone(input: string): string {
  return input.replace(/\D/g, '').replace(/^55/, '').slice(0, 11);
}

function validateRow(headers: string[], values: string[]): ParsedRow {
  const get = (field: string) => {
    const idx = headers.indexOf(field);
    return idx >= 0 && idx < values.length ? values[idx].trim() : '';
  };

  const nome = sanitizeName(get('nome'));
  const rawPhone = get('telefone');
  const telefone = normalizePhone(rawPhone);
  const email = get('email').trim().slice(0, 255);
  const cidade = get('cidade').trim().slice(0, 120);
  const modelo = get('modelo_recomendado').trim().slice(0, 120);
  const obs = get('observacoes').trim().slice(0, 500);

  const errors: string[] = [];
  if (!nome || nome.length < 2) errors.push('Nome inválido');
  if (!isValidBRPhone(telefone)) errors.push('Telefone inválido');
  if (email && !isValidEmail(email)) errors.push('E-mail inválido');

  return {
    nome,
    telefone,
    email,
    cidade,
    modelo_recomendado: modelo,
    observacoes: obs,
    errors,
    valid: errors.length === 0,
  };
}

export function CSVLeadImport({ franchiseId, trigger, onSuccess }: CSVLeadImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const reset = useCallback(() => {
    setStep('upload');
    setRows([]);
    setImportProgress(0);
    setImportResult({ success: 0, failed: 0 });
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error('Formato inválido. Use um arquivo .csv');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows: rawRows } = parseCSV(text);

      if (!headers.includes('nome') || !headers.includes('telefone')) {
        toast.error('CSV deve conter ao menos as colunas "nome" e "telefone"');
        return;
      }

      const parsed = rawRows.map(r => validateRow(headers, r)).filter(r => r.nome || r.telefone);

      if (parsed.length === 0) {
        toast.error('Nenhum lead válido encontrado no arquivo');
        return;
      }

      if (parsed.length > 500) {
        toast.error('Máximo de 500 leads por importação');
        return;
      }

      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setStep('importing');
    let success = 0;
    let failed = 0;
    const batchSize = 25;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(r => ({
        nome: r.nome,
        telefone: r.telefone,
        email: r.email || null,
        cidade: r.cidade || null,
        modelo_recomendado: r.modelo_recomendado || null,
        observacoes: r.observacoes || null,
        franquia_id: franchiseId,
        origin_franchise_id: franchiseId,
        lead_origin: 'csv_import',
        status_lead: 'novo' as const,
      }));

      const { error, data } = await supabase.from('leads').insert(batch).select('id');

      if (error) {
        failed += batch.length;
      } else {
        success += data?.length || batch.length;
      }

      setImportProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setImportResult({ success, failed });
    setStep('done');
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
  }, [rows, franchiseId, queryClient]);

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  const downloadTemplate = () => {
    const csv = 'nome,telefone,email,cidade,modelo_recomendado,observacoes\nJoão Silva,51999998888,joao@email.com,Porto Alegre,Retangular,Indicação do vizinho\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Upload className="w-4 h-4" />
            Importar CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {step === 'upload' && 'Importar Leads via CSV'}
            {step === 'preview' && 'Pré-visualização'}
            {step === 'importing' && 'Importando...'}
            {step === 'done' && 'Importação Concluída'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Arraste seu CSV aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar o arquivo</p>
              <p className="text-xs text-muted-foreground mt-2">Máx. 500 leads · Arquivo .csv até 5MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            <div className="bg-muted/50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Colunas aceitas:</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPECTED_HEADERS.map(h => (
                  <Badge key={h} variant="secondary" className="text-xs">
                    {h}{(h === 'nome' || h === 'telefone') && ' *'}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">* Campos obrigatórios. Separador: vírgula ou ponto-e-vírgula.</p>
            </div>

            <Button variant="ghost" size="sm" className="w-full text-xs gap-2" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5" />
              Baixar modelo de CSV
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {invalidCount} com erro
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{rows.length} leads encontrados</span>
            </div>

            <ScrollArea className="flex-1 max-h-[350px] border rounded-xl">
              <div className="min-w-[500px]">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">#</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Telefone</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Cidade</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={cn('border-t border-border/30', !row.valid && 'bg-destructive/5')}>
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium">{row.nome || '—'}</td>
                        <td className="p-2 font-mono">{row.telefone || '—'}</td>
                        <td className="p-2">{row.cidade || '—'}</td>
                        <td className="p-2">
                          {row.valid ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <span className="text-destructive text-xs">{row.errors.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={reset}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button className="flex-1 rounded-xl" onClick={handleImport} disabled={validCount === 0}>
                <Upload className="w-4 h-4 mr-2" />
                Importar {validCount} leads
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-sm font-medium">Importando leads...</p>
            <Progress value={importProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{importProgress}% concluído</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <p className="text-lg font-semibold">{importResult.success} leads importados</p>
              {importResult.failed > 0 && (
                <p className="text-sm text-destructive mt-1">{importResult.failed} falharam</p>
              )}
            </div>
            <Button onClick={() => { setOpen(false); reset(); onSuccess?.(); }} className="rounded-xl">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
