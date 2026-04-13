import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import type { ProposalFormData } from '@/pages/NewProposal';
import { ProposalAttachments } from './ProposalAttachments';

interface Props {
  form: ProposalFormData;
  updateForm: (u: Partial<ProposalFormData>) => void;
  proposalId?: string | null;
  franchiseId?: string;
}

export function ProposalObservationsSection({ form, updateForm, proposalId, franchiseId }: Props) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Observações Adicionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm">Observações, termos especiais, etc.</Label>
          <Textarea
            value={form.observations}
            onChange={(e) => updateForm({ observations: e.target.value })}
            placeholder="Adicione observações, termos especiais ou qualquer informação relevante para a proposta..."
            className="mt-1.5 min-h-[120px]"
            rows={5}
          />
        </div>
        <div>
          <Label className="text-sm mb-2 block">Anexos</Label>
          <ProposalAttachments
            proposalId={proposalId || null}
            franchiseId={franchiseId || ''}
          />
        </div>
      </CardContent>
    </Card>
  );
}
