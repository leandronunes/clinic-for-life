# Testes E2E (Playwright)

Suíte end-to-end que valida os principais fluxos de negócio da aplicação
navegando de verdade num browser (Chromium), sem mocks de componente — ao
contrário da suíte principal (`npm run test`, jsdom + `vi.mock`).

Roda contra um **build de produção (`npm run build` + `npm run preview`)** com
o backend mock offline (`VITE_OFFLINE=true`, ver `@/lib/api/mock`), então não
depende do Rails (`clinic-for-life-backend`) nem de rede — os dados são os
seeds de `src/lib/api/mock/fixtures.ts` (alunos, personais, parceiros,
treinos, contas de demonstração).

Build + preview em vez de `vite dev` de propósito: o cold-start do dev server
(pre-bundling de dependências) estava estourando o timeout do
`config.webServer` nos runners do CI; um preview de build já pronto sobe em
~1s.

## Como rodar localmente

```bash
npx playwright install chromium   # uma vez, baixa o browser
npm run test:e2e                  # roda a suíte headless
npm run test:e2e:ui               # modo UI interativo (recomendado p/ debugar)
npm run test:e2e:report           # abre o último relatório HTML
```

`npm run test:e2e` já builda e sobe o preview sozinho (`playwright.config.ts`,
`webServer`). **Atenção**: se já houver um preview rodando na porta 4321
(`reuseExistingServer` fora do CI), ele é reaproveitado sem rebuildar — se
você alterou código da aplicação (não só os testes), mate o processo antigo
antes de rodar de novo, ou o teste vai bater contra um build desatualizado.

`npm run test:e2e` já sobe o dev server sozinho (`playwright.config.ts`,
`webServer`) — não precisa rodar `npm run dev` à parte. Em desenvolvimento
local ele reaproveita um servidor já rodando na porta 4321, se existir.

## Contas de demonstração usadas nos testes

Ver `e2e/fixtures.ts` — mesmas contas do modo offline (`docs`/`.env.example`):

| Papel    | E-mail                | Senha          |
| -------- | ---------------------- | -------------- |
| admin    | admin@forlife.app       | Admin@2026     |
| personal | personal@forlife.app    | Personal@2026  |
| aluno    | aluno@forlife.app       | Aluno@2026     |

## Estrutura

- `e2e/fixtures.ts` — helper `loginAs(page, role)` e as contas de demonstração.
- `e2e/auth.spec.ts` — login (as 3 contas, credenciais inválidas), logout,
  proteção de rota para usuário não autenticado.
- `e2e/dashboard.spec.ts` — KPIs por papel, troca de período, card de assiduidade.
- `e2e/usuarios-admin.spec.ts` — CRUD de alunos e personais (admin), busca,
  visão restrita do personal.
- `e2e/aluno-treino.spec.ts` — visualização de treinos (ativos/arquivados),
  troca de treino, admin "entrando como aluno" (impersonation).
- `e2e/aluno-checkin.spec.ts` — check-in de treino (iniciar, marcar exercícios,
  conclusão automática e manual/parcial) e Assiduidade (histórico + envio de
  feedback pelo personal, visão somente leitura do aluno).
- `e2e/parceiros.spec.ts` — vitrine pública de parceiros + CRUD (admin).
- `e2e/evolucao.spec.ts` — cartões de métricas e gráfico de evolução;
  regressão de layout mobile (sem scroll horizontal) na visão com upload
  cards (admin/personal via impersonation).

Não cobre ainda (extensão natural, se o fluxo virar prioridade): anamnese
dinâmica, avaliação biomecânica, exames, upload de vídeo de exercício.

## Como adicionar um novo teste

1. Crie `e2e/<fluxo>.spec.ts`. Use `loginAs(page, role)` de `./fixtures` para
   autenticar — nunca reimplemente o formulário de login manualmente.
2. Prefira `getByRole`/`getByLabel` a seletores de CSS/texto cru — mas cuidado:
   `getByText`/`getByLabel` fazem **substring match case-insensitive por
   padrão**. Nomes curtos (“Alunos”, “Entrar”, “Senha”) frequentemente colidem
   com outro texto da página (nav, outro botão, tooltip de gráfico) — use
   `{ exact: true }` ou escopo (`page.getByRole("main").getByText(...)`)
   sempre que o texto não for claramente único.
3. **Gap conhecido**: o componente `Field` usado nos diálogos de
   `_app.usuarios.tsx` renderiza `<Label>` sem `htmlFor`/`id`, então
   `getByLabel` não funciona nesses formulários — use seletor por posição/tipo
   de input (ver comentário em `usuarios-admin.spec.ts`). Os formulários de
   `_app.parceiros.tsx` já usam `htmlFor` corretamente.
4. Rode `npm run test:e2e:ui` durante o desenvolvimento do teste — muito mais
   rápido para iterar do que ler logs de falha.
5. Rode a suíte 2-3 vezes antes de commitar (`npm run test:e2e`) para pegar
   flakiness cedo.

## Como roda no CI

Job **`e2e`** em `.github/workflows/ci.yml`, paralelo aos demais. Instala o
Chromium (`npx playwright install --with-deps chromium`) e publica o relatório
HTML como artifact (`playwright-report/`) sempre, inclusive quando falha —
baixe o artifact do run para ver screenshots/traces da falha.
