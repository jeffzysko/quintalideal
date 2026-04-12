import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProposalFormData } from '@/pages/NewProposal';

interface Props {
  form: ProposalFormData;
  updateForm: (u: Partial<ProposalFormData>) => void;
}

export function ProposalClientSection({ form, updateForm }: Props) {
  const isPJ = form.person_type === 'pj';
  const linkedToLead = !!form.lead_id;

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Dados do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Person type toggle */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo de Pessoa</Label>
          <div className="flex rounded-xl bg-muted p-1 w-fit">
            <button
              onClick={() => updateForm({ person_type: 'pf' })}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                !isPJ ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Pessoa Física
            </button>
            <button
              onClick={() => updateForm({ person_type: 'pj' })}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isPJ ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Pessoa Jurídica
            </button>
          </div>
        </div>

        {linkedToLead && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            Campos preenchidos pelo lead. Editar aqui não altera os dados do lead original.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="client_name" className="text-sm">
              {isPJ ? 'Razão Social' : 'Nome Completo'} <span className="text-destructive">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="client_name"
                value={form.client_name}
                onChange={(e) => updateForm({ client_name: e.target.value })}
                placeholder={isPJ ? 'Razão Social da empresa' : 'Nome completo do cliente'}
              />
              {linkedToLead && form.client_name && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="client_document" className="text-sm">{isPJ ? 'CNPJ' : 'CPF'}</Label>
            <Input
              id="client_document"
              value={form.client_document}
              onChange={(e) => updateForm({ client_document: e.target.value })}
              placeholder={isPJ ? '00.000.000/0000-00' : '000.000.000-00'}
              className="mt-1.5"
            />
          </div>

          {isPJ && (
            <div>
              <Label htmlFor="client_contact_name" className="text-sm">Nome do Contato</Label>
              <Input
                id="client_contact_name"
                value={form.client_contact_name}
                onChange={(e) => updateForm({ client_contact_name: e.target.value })}
                placeholder="Nome do responsável"
                className="mt-1.5"
              />
            </div>
          )}

          <div>
            <Label htmlFor="client_phone" className="text-sm">
              Telefone <span className="text-destructive">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="client_phone"
                value={form.client_phone}
                onChange={(e) => updateForm({ client_phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
              {linkedToLead && form.client_phone && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="client_email" className="text-sm">Email</Label>
            <div className="relative mt-1.5">
              <Input
                id="client_email"
                type="email"
                value={form.client_email}
                onChange={(e) => updateForm({ client_email: e.target.value })}
                placeholder="email@exemplo.com"
              />
              {linkedToLead && form.client_email && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="client_address" className="text-sm">Endereço</Label>
            <Input
              id="client_address"
              value={form.client_address}
              onChange={(e) => updateForm({ client_address: e.target.value })}
              placeholder="Rua, número, bairro, cidade - UF"
              className="mt-1.5"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
