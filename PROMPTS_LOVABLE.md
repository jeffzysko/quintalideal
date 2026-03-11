# Prompts para Lovable - Melhorias Quintal Ideal

Envie cada fase separadamente na Lovable. Aguarde a conclusão de cada fase antes de enviar a próxima.

---

## FASE 1 — Correções Críticas de Segurança

```
Preciso aplicar correções críticas de segurança no projeto. Faça todas as alterações abaixo:

1. **Adicionar .env ao .gitignore**:
   - Adicione `.env` e `.env.*` (exceto `.env.example`) ao arquivo `.gitignore`
   - Crie um arquivo `.env.example` na raiz com o seguinte conteúdo (sem valores reais):
     ```
     VITE_SUPABASE_PROJECT_ID="seu-project-id"
     VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key"
     VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
     ```

2. **Restringir CORS nas Edge Functions**:
   - Em TODAS as 3 Edge Functions (check-duplicate-lead, notify-new-lead, invite-franchise-user), altere o header CORS de:
     ```typescript
     "Access-Control-Allow-Origin": "*"
     ```
     Para:
     ```typescript
     "Access-Control-Allow-Origin": "https://quintalideal.com.br"
     ```

3. **Adicionar rate limiting básico na Edge Function check-duplicate-lead**:
   - Adicione um controle simples baseado em IP usando um Map em memória com TTL de 60 segundos e limite de 10 requisições por minuto por IP:
     ```typescript
     const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

     function isRateLimited(ip: string): boolean {
       const now = Date.now();
       const entry = rateLimitMap.get(ip);
       if (!entry || now > entry.resetAt) {
         rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
         return false;
       }
       entry.count++;
       return entry.count > 10;
     }
     ```
   - No início do handler, antes de qualquer processamento, adicione:
     ```typescript
     const ip = req.headers.get("x-forwarded-for") || "unknown";
     if (isRateLimited(ip)) {
       return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }), {
         status: 429,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
     ```

4. **Adicionar headers de segurança no index.html**:
   - Adicione estas meta tags dentro do <head> do index.html:
     ```html
     <meta http-equiv="X-Content-Type-Options" content="nosniff">
     <meta http-equiv="X-Frame-Options" content="DENY">
     <meta name="referrer" content="strict-origin-when-cross-origin">
     ```

Não altere nenhuma funcionalidade existente. Apenas aplique essas correções de segurança.
```

---

## FASE 2 — Error Handling e Estabilidade

```
Preciso melhorar o tratamento de erros e a estabilidade da aplicação. Faça todas as alterações abaixo:

1. **Criar um Error Boundary global**:
   - Crie o arquivo `src/components/ErrorBoundary.tsx` como um class component React:
     ```typescript
     import { Component, ReactNode } from 'react';
     import { Button } from '@/components/ui/button';
     import { AlertTriangle } from 'lucide-react';

     interface Props { children: ReactNode; }
     interface State { hasError: boolean; }

     export class ErrorBoundary extends Component<Props, State> {
       constructor(props: Props) {
         super(props);
         this.state = { hasError: false };
       }
       static getDerivedStateFromError() { return { hasError: true }; }
       componentDidCatch(error: Error, info: React.ErrorInfo) {
         console.error('ErrorBoundary caught:', error, info);
       }
       render() {
         if (this.state.hasError) {
           return (
             <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
               <AlertTriangle className="w-12 h-12 text-amber-500" />
               <h1 className="text-xl font-bold">Algo deu errado</h1>
               <p className="text-muted-foreground text-center max-w-md">
                 Ocorreu um erro inesperado. Tente recarregar a página.
               </p>
               <Button onClick={() => window.location.reload()}>
                 Recarregar página
               </Button>
             </div>
           );
         }
         return this.props.children;
       }
     }
     ```
   - No `App.tsx`, envolva todo o conteúdo do App com o ErrorBoundary (logo dentro do QueryClientProvider):
     ```typescript
     <QueryClientProvider client={queryClient}>
       <ErrorBoundary>
         <AuthProvider>
           ...
         </AuthProvider>
       </ErrorBoundary>
     </QueryClientProvider>
     ```

2. **Adicionar tratamento de erro no carregamento de dados do AdminDashboard**:
   - No `AdminDashboard.tsx`, na função `loadData`, adicione try-catch:
     ```typescript
     const loadData = async () => {
       try {
         const [leadsRes, franchisesRes] = await Promise.all([...]);
         if (leadsRes.error) throw leadsRes.error;
         if (franchisesRes.error) throw franchisesRes.error;
         setLeads(leadsRes.data || []);
         setFranchises(franchisesRes.data || []);
       } catch (err) {
         console.error('Erro ao carregar dados:', err);
         toast.error('Erro ao carregar dados. Tente recarregar a página.');
       } finally {
         setLoading(false);
       }
     };
     ```
   - Faça o mesmo padrão no `FranchiseDashboard.tsx` onde os dados são carregados via useEffect.

3. **Adicionar tratamento de erro no FranchiseLanding.tsx**:
   - Quando a franquia não é encontrada ou está inativa, mostre uma mensagem amigável com botão para voltar à home, em vez de uma mensagem genérica.

4. **Adicionar estado de erro nos componentes de analytics (AdminAnalytics)**:
   - Se a query de analytics_events falhar, mostre uma mensagem "Não foi possível carregar analytics" com botão de retry, em vez de silenciosamente mostrar dados vazios.

Não altere o design visual existente. Mantenha o estilo consistente com o restante da aplicação.
```

---

## FASE 3 — Performance e Arquitetura dos Dashboards

```
Preciso melhorar a performance dos dashboards. O sistema atualmente carrega TODOS os leads de uma vez na memória, o que vai causar problemas sérios quando houver centenas ou milhares de leads. Faça as seguintes alterações:

1. **Implementar paginação server-side no AdminDashboard**:
   - Adicione um estado de paginação:
     ```typescript
     const [page, setPage] = useState(1);
     const PAGE_SIZE = 25;
     ```
   - Altere a query de leads para usar `.range()` do Supabase:
     ```typescript
     const from = (page - 1) * PAGE_SIZE;
     const to = from + PAGE_SIZE - 1;

     let query = supabase
       .from('leads')
       .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by', { count: 'exact' });

     // Aplicar filtros server-side
     if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
     if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus);
     if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
     if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
     if (search) query = query.ilike('nome', `%${search}%`);

     const { data, count, error } = await query
       .order('created_at', { ascending: false })
       .range(from, to);
     ```
   - Adicione um componente de paginação abaixo da tabela usando os componentes shadcn/ui Pagination:
     ```typescript
     <div className="flex items-center justify-between mt-4">
       <p className="text-sm text-muted-foreground">
         Mostrando {from + 1}-{Math.min(to + 1, totalCount)} de {totalCount} leads
       </p>
       <div className="flex gap-2">
         <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
           Anterior
         </Button>
         <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= totalCount}>
           Próximo
         </Button>
       </div>
     </div>
     ```
   - Os filtros devem resetar a página para 1 quando alterados.
   - Mantenha uma query separada SEM paginação apenas para os KPIs e gráficos (dados agregados).

2. **Adicionar debounce nos campos de busca/filtro**:
   - Nos campos Input de busca por nome e filtro por cidade no AdminDashboard, adicione debounce de 400ms antes de disparar a query:
     ```typescript
     const [searchInput, setSearchInput] = useState('');
     const [search, setSearch] = useState('');

     useEffect(() => {
       const timer = setTimeout(() => setSearch(searchInput), 400);
       return () => clearTimeout(timer);
     }, [searchInput]);
     ```
   - O Input deve usar `searchInput` como value e `setSearchInput` no onChange.
   - O filtro real (`search`) é usado na query com delay.
   - Faça o mesmo para o campo de cidade.

3. **Corrigir encoding do export CSV**:
   - Na função `exportCSV` do AdminDashboard, adicione BOM UTF-8 para que o Excel exiba acentos corretamente:
     ```typescript
     const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
     ```
   - O export deve exportar TODOS os leads filtrados (não paginados), então faça uma query sem `.range()` específica para o export.

4. **Aplicar o mesmo padrão de paginação no FranchiseDashboard**:
   - Implemente a mesma lógica de paginação server-side com PAGE_SIZE = 20.
   - Mantenha os KPIs calculados a partir de uma query separada sem paginação.

Mantenha o design visual atual. Apenas adicione a paginação e os debounces.
```

---

## FASE 4 — Migração para React Query e Refatoração

```
Preciso migrar os dashboards para usar React Query (TanStack Query) que já está instalado e configurado no projeto, e extrair constantes duplicadas. Faça as seguintes alterações:

1. **Extrair constantes duplicadas para arquivo compartilhado**:
   - Crie o arquivo `src/lib/lead-constants.ts` com:
     ```typescript
     export const STATUS_LABELS: Record<string, string> = {
       novo: 'Novo',
       contatado: 'Contatado',
       em_negociacao: 'Em Negociação',
       vendido: 'Vendido',
       perdido: 'Perdido',
     };

     export const STATUS_COLORS: Record<string, string> = {
       novo: 'bg-primary/10 text-primary border-primary/20',
       contatado: 'bg-amber-50 text-amber-700 border-amber-200',
       em_negociacao: 'bg-violet-50 text-violet-700 border-violet-200',
       vendido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
       perdido: 'bg-red-50 text-red-700 border-red-200',
     };
     ```
   - Remova as definições duplicadas de `statusLabels` e `statusColors` dos arquivos `AdminDashboard.tsx`, `FranchiseDashboard.tsx` e `FranchiseReports.tsx`.
   - Importe de `@/lib/lead-constants` em todos esses arquivos.

2. **Migrar AdminDashboard para React Query**:
   - Substitua o padrão `useState + useEffect + loadData` por `useQuery`:
     ```typescript
     import { useQuery } from '@tanstack/react-query';

     // Para KPIs (todos os leads, sem paginação)
     const { data: allLeads = [], isLoading: loadingKpis } = useQuery({
       queryKey: ['admin-leads-all'],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('leads')
           .select('id, cidade, pontuacao_quintal, modelo_recomendado, status_lead, franquia_id, referred_by, created_at');
         if (error) throw error;
         return data || [];
       },
     });

     // Para tabela paginada (com filtros)
     const { data: paginatedData, isLoading: loadingTable } = useQuery({
       queryKey: ['admin-leads-table', page, search, filterFranquia, filterStatus, filterModelo, filterCidade],
       queryFn: async () => {
         let query = supabase.from('leads').select('...', { count: 'exact' });
         // aplicar filtros...
         const { data, count, error } = await query.range(from, to);
         if (error) throw error;
         return { leads: data || [], total: count || 0 };
       },
     });

     // Para franquias
     const { data: franchises = [] } = useQuery({
       queryKey: ['franchises'],
       queryFn: async () => {
         const { data, error } = await supabase.from('franchises').select('id, nome_franquia');
         if (error) throw error;
         return data || [];
       },
     });
     ```
   - Remova os estados `leads`, `franchises` e `loading` manuais.
   - Use `isLoading` do React Query para mostrar o spinner.
   - Use `isError` para mostrar mensagem de erro.

3. **Migrar FranchiseDashboard para React Query**:
   - Aplique o mesmo padrão acima, adaptando para os dados da franquia.
   - Use `franchiseId` do `useAuth()` no queryKey para cache por franquia:
     ```typescript
     queryKey: ['franchise-leads', franchiseId, page]
     ```

4. **Refatorar AdminDashboard em componentes menores**:
   - Extraia a seção de filtros para `src/components/admin/AdminLeadFilters.tsx`
   - Extraia a tabela de leads para `src/components/admin/AdminLeadsTable.tsx`
   - Extraia os KPI cards para `src/components/admin/AdminKPICards.tsx`
   - O AdminDashboard.tsx deve ficar apenas com o layout, tabs e composição dos subcomponentes.
   - Passe os dados via props para cada subcomponente.

Mantenha toda a funcionalidade e design visual existentes. Apenas reorganize o código.
```

---

## FASE 5 — UX, Acessibilidade e Skeleton Loaders

```
Preciso melhorar a experiência do usuário com skeleton loaders, acessibilidade e pequenas melhorias de UX. Faça as seguintes alterações:

1. **Criar componente de Skeleton Loader para tabelas**:
   - Crie `src/components/ui/table-skeleton.tsx`:
     ```typescript
     import { Skeleton } from '@/components/ui/skeleton';

     export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
       return (
         <div className="space-y-3">
           {Array.from({ length: rows }).map((_, i) => (
             <div key={i} className="flex gap-4">
               {Array.from({ length: cols }).map((_, j) => (
                 <Skeleton key={j} className="h-5 flex-1 rounded" />
               ))}
             </div>
           ))}
         </div>
       );
     }
     ```

2. **Criar Skeleton Loader para KPI cards**:
   - Crie `src/components/ui/kpi-skeleton.tsx`:
     ```typescript
     import { Skeleton } from '@/components/ui/skeleton';
     import { Card, CardContent } from '@/components/ui/card';

     export function KPISkeleton({ count = 6 }: { count?: number }) {
       return (
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
           {Array.from({ length: count }).map((_, i) => (
             <Card key={i} className="border-border/50">
               <CardContent className="p-4 space-y-2">
                 <Skeleton className="h-5 w-5 rounded" />
                 <Skeleton className="h-8 w-16 rounded" />
                 <Skeleton className="h-3 w-24 rounded" />
               </CardContent>
             </Card>
           ))}
         </div>
       );
     }
     ```

3. **Substituir spinners por skeletons nos dashboards**:
   - No AdminDashboard, enquanto `loadingKpis` for true, mostre o `<KPISkeleton />` no lugar dos KPI cards.
   - Enquanto `loadingTable` for true, mostre `<TableSkeleton rows={10} cols={8} />` no lugar da tabela de leads.
   - No FranchiseDashboard, aplique o mesmo padrão.

4. **Melhorar acessibilidade em toda a aplicação**:
   - Adicione `aria-label` em todos os botões que possuem apenas ícone (sem texto visível):
     - Botão de olho (Eye) na tabela: `aria-label="Ver detalhes do lead"`
     - Botão de download CSV: `aria-label="Exportar leads para CSV"`
     - Botão de logout: `aria-label="Sair da conta"`
     - Botão de radar: `aria-label="Abrir radar de mercado"`
     - Botão de mapa: `aria-label="Abrir mapa de quintais"`
   - Nos tab buttons do AdminDashboard, adicione `role="tab"` e `aria-selected={activeTab === 'xxx'}`.
   - Envolva os tabs com `role="tablist"`.
   - Adicione `aria-live="polite"` nos containers de mensagens de erro do LeadForm e nas mensagens de duplicata.
   - Na tabela de leads, adicione `role="table"`, `role="row"`, `role="columnheader"` nos th e `role="cell"` nos td.

5. **Adicionar empty states melhores**:
   - Na tabela de leads do AdminDashboard, quando `filteredLeads` estiver vazio e não estiver carregando, mostre:
     ```
     Ícone de Search (lucide) centralizado
     "Nenhum lead encontrado"
     "Tente ajustar os filtros de busca"
     ```
   - Estilize com text-muted-foreground e padding generoso (py-16).

6. **Corrigir rota /:slug para evitar conflitos futuros**:
   - No App.tsx, mova a rota `/:slug` para ANTES da rota catch-all `*`, mas DEPOIS de todas as outras rotas fixas. Ela já está nessa posição, então apenas adicione um comentário:
     ```typescript
     {/* Franchise dynamic landing - must be last before catch-all */}
     <Route path="/:slug" element={<FranchiseLanding />} />
     ```

Mantenha o design visual e as cores existentes. As melhorias devem se integrar naturalmente ao estilo atual.
```

---

## FASE 6 — TypeScript Strict, Testes e Qualidade de Código

```
Preciso melhorar a qualidade do código e adicionar mais testes. Faça as seguintes alterações:

1. **Habilitar verificações TypeScript gradualmente**:
   - No `tsconfig.app.json`, altere:
     ```json
     "noUnusedLocals": true,
     "noUnusedParameters": true
     ```
   - NÃO habilite `strict`, `noImplicitAny` ou `strictNullChecks` agora (isso quebraria muita coisa). Apenas as duas flags acima.
   - Corrija TODOS os erros de compilação que surgirem (variáveis e parâmetros não utilizados). Remova imports não usados, prefixe parâmetros obrigatórios não usados com underscore (_).

2. **Reforçar ESLint**:
   - No `eslint.config.js`, altere a regra desabilitada:
     ```javascript
     "@typescript-eslint/no-unused-vars": ["warn", {
       "argsIgnorePattern": "^_",
       "varsIgnorePattern": "^_"
     }]
     ```

3. **Adicionar testes de componente para o LeadForm**:
   - Crie `src/test/LeadForm.test.tsx`:
     - Teste que o formulário renderiza os 3 campos (nome, telefone, email)
     - Teste que erros de validação aparecem quando o formulário é submetido vazio
     - Teste que a formatação do telefone funciona corretamente (digitando "51999999999" deve formatar para "(51) 99999-9999")
     - Teste que o callback onSubmit é chamado com dados sanitizados quando o formulário é válido
     - Teste que a mensagem de duplicata aparece quando onCheckDuplicate retorna duplicate: true

4. **Adicionar testes de componente para o ProtectedRoute**:
   - Crie `src/test/ProtectedRoute.test.tsx`:
     - Teste que redireciona para /login quando não há usuário
     - Teste que renderiza children quando o usuário tem o role permitido
     - Teste que redireciona para /painel quando o role não é permitido
     - Mocke o hook useAuth para cada cenário

5. **Remover console.log e console.error desnecessários**:
   - Nos arquivos de componentes (não nos testes), substitua `console.error` por nada ou por um toast de erro quando for relevante para o usuário.
   - Mantenha `console.error` apenas no ErrorBoundary (componentDidCatch) e nos Edge Functions (server-side).
   - Remova qualquer `console.log` que não seja essencial.

6. **Corrigir o domínio do remetente de email**:
   - No Edge Function `notify-new-lead/index.ts`, altere o remetente de:
     ```typescript
     from: "Quintal Ideal Splash <noreply@hallow.com.br>"
     ```
     Para:
     ```typescript
     from: "Quintal Ideal Splash <noreply@quintalideal.com.br>"
     ```
   - Faça o mesmo no `invite-franchise-user/index.ts` se houver o mesmo domínio incorreto.

Garanta que o build (`npm run build`) passe sem erros após todas as alterações.
```

---

## Ordem de execução recomendada

| Fase | Foco | Risco | Prioridade |
|------|------|-------|------------|
| 1 | Segurança | Baixo | Imediata |
| 2 | Estabilidade | Baixo | Imediata |
| 3 | Performance | Médio | Alta |
| 4 | Refatoração | Médio | Alta |
| 5 | UX/a11y | Baixo | Média |
| 6 | Qualidade | Médio | Média |

> **Dica:** Após cada fase, rode `npm run build` para garantir que não quebrou nada. Se algum prompt for muito longo para a Lovable processar de uma vez, quebre-o nos itens numerados e envie um por vez.
