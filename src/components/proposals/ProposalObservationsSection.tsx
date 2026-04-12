import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProposalFormData } from '@/pages/NewProposal';

interface Props {
  form: ProposalFormData;
  updateForm: (u: Partial<ProposalFormData>) => void;
}

export function ProposalObservationsSection({ form, updateForm }: Props) {
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <Paperclip className="w-4 h-4 mr-1" /> Anexar arquivos
            </Button>
          </TooltipTrigger>
          <TooltipContent>Em breve</TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
