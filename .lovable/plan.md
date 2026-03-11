

# Índice do Quintal Splash — Plano de Implementação

## Visão Geral
Plataforma interativa de geração de leads para franquias Splash Piscinas no RS. O usuário responde perguntas, envia fotos do quintal e recebe uma pontuação + recomendação de piscina. Franquias e fábrica gerenciam leads em painéis dedicados.

---

## Fase 1 — Estrutura do Banco de Dados (Lovable Cloud)

### Tabelas
- **franchises** — dados de cada franquia (nome, cidade, slug, WhatsApp, email, responsável)
- **pool_models** — catálogo de piscinas (nome, dimensões, prainha, spa, categoria, imagem)
- **leads** — dados do lead (nome, telefone, email, cidade, franquia vinculada, pontuação, modelo recomendado, respostas JSON, fotos, status, observações, data)
- **user_roles** — controle de acesso (admin_fabrica, franquia, visualizador) com segurança via função `has_role`
- **profiles** — perfil do usuário logado com vínculo à franquia (para painéis)

### Storage
- Bucket `quintal-photos` para fotos dos quintais (público para leitura)

### Segurança (RLS)
- Leads: franquia só vê seus próprios leads; admin vê todos
- Franquias: admin pode editar; franquia só lê a sua

---

## Fase 2 — Landing Page + Fluxo Interativo (Mobile-First)

### Tela 1: Hero
- Título "Seu quintal tem potencial para ter uma piscina?"
- Subtítulo e botão "Descobrir agora"
- Design com cores da marca Splash

### Tela 2: Upload de Fotos
- Upload de 1 a 4 imagens (JPG/PNG)
- Preview das fotos com opção de remover
- Mensagem orientativa
- Salva no storage do Supabase

### Tela 3: Questionário (6 perguntas sequenciais)
- Cada pergunta em tela cheia com opções grandes e clicáveis
- Barra de progresso no topo
- Pergunta 6 (cidade) com autocomplete de cidades do RS

### Tela 4: Resultado Animado
- Animação da pontuação de 0 até o valor final (ex: 82%)
- Anel circular com a porcentagem
- Modelo de piscina recomendado com imagem e descrição

### Tela 5: Captura de Lead
- Formulário: nome, WhatsApp, email (opcional)
- Validação com Zod

### Tela 6: Ações
- "Receber estimativa" — salva interesse
- "Falar com especialista" — abre WhatsApp da franquia
- "Compartilhar resultado" — gera imagem estilo story para download

---

## Fase 3 — Rotas por Franquia

- Cada franquia tem slug (ex: `/taquara`, `/santarosa`)
- Leads criados nessas rotas vinculam automaticamente à franquia
- Mesma landing page, personalizada com nome da franquia

---

## Fase 4 — Painel da Franquia

- Login com email/senha
- Dashboard simples: total de leads, leads recentes
- Lista de leads com: nome, cidade, pontuação, modelo, data, status
- Ficha do lead: respostas, fotos do quintal, contato, WhatsApp, campo de observações, alterar status (novo → contatado → em negociação → vendido → perdido)
- Vê apenas seus próprios leads

---

## Fase 5 — Painel da Fábrica (Admin Master)

- Dashboard com métricas: total de leads, por franquia, por cidade, por período
- Gráficos (Recharts): leads/mês, por franquia, distribuição por cidade
- Filtros: franquia, cidade, data, status, modelo, pontuação
- Tabela completa de leads com busca
- Exportação CSV
- Gestão de franquias (CRUD)
- Acesso a todos os leads de todas as franquias

---

## Lógica de Pontuação

| Critério | Pontuação máxima |
|---|---|
| Espaço disponível | 40 pts |
| Situação da casa | 20 pts |
| Intenção de compra | 20 pts |
| Perfil de uso | 20 pts |

Recomendação automática baseada em espaço + preferências (prainha/spa/simples).

---

## Design
- Mobile-first, fontes grandes, botões touch-friendly
- Cores e logo da marca Splash (a serem enviadas pelo usuário)
- Fluxo otimizado para completar em ~45 segundos
- Animações sutis nas transições entre etapas

