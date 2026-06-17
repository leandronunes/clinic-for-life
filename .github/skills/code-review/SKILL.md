---
name: code-review
description: 'Revisa código do frontend Clinic for Life (React 19 + TypeScript estrito, TanStack Start/Router/Query, Tailwind v4 + shadcn/ui, react-hook-form + zod, Vitest). Use quando o usuário pedir "code review", "revisar PR", "revisar código", "analisar mudanças", "verificar boas práticas", checar antes de commitar/abrir PR, ou validar aderência às convenções do projeto. Cobre tipagem, roteamento, data fetching, auth, acessibilidade, testes e segurança.'
argument-hint: 'Arquivos, pasta, diff ou branch a revisar (ex.: src/routes/_app.dashboard.tsx ou "mudanças no branch atual")'
---

# Code Review — Frontend Clinic for Life

Revisão de código sistemática e acionável para este projeto React. Produz um
parecer organizado por severidade, com referências a arquivos/linhas e sugestões
de correção alinhadas às convenções do repositório (`.github/copilot-instructions.md`).

## Quando usar

- Antes de abrir/aprovar um PR ou commitar mudanças relevantes.
- Quando pedirem "revisar este código/arquivo/diff/branch".
- Para auditar aderência aos padrões do projeto (tipagem, rotas, data fetching, testes).

## Procedimento

### 1. Delimitar o escopo
- Se o usuário indicou arquivos/pasta/branch, revise apenas isso.
- Caso contrário, descubra o que mudou:
  - `git diff --name-only` e `git diff` (working tree), ou
  - `git diff main...HEAD` para o branch atual.
- Leia os arquivos alterados por completo antes de comentar; entenda o contexto
  (rota, componente, hook, camada de API) — não revise trechos isolados.

### 2. Rodar as verificações automáticas
Execute e considere os resultados na revisão:
- `npm run lint` — ESLint (regras `react-hooks`, `no-restricted-imports`, Prettier).
- `npm run test` — Vitest (todos os testes devem passar).
- Se houver erros de tipo, rode a checagem de tipos do editor/TS.
Reporte falhas como bloqueadores.

### 3. Revisar contra o checklist
Use [checklist.md](./checklist.md) como guia. Foque em:
- **TypeScript estrito**: sem `any`; props, retornos e payloads tipados; `import type`.
- **Imports**: alias `@/*`, sem `../../../` profundos; sem `server-only`.
- **Roteamento**: `createFileRoute`, `<Outlet />`, params com `$`; nunca editar
  `routeTree.gen.ts`; módulos server-only com sufixo `*.server.ts`.
- **Data fetching**: TanStack Query (`useQuery`/`useMutation`); HTTP só via
  `@/lib/api/http`; `queryKey`s estáveis; invalidação após mutations; estados de
  loading/erro/vazio tratados.
- **Componentes/estilo**: reuso de `src/components/ui` (shadcn/ui); helper `cn`;
  regras de hooks (sem hooks condicionais); componentes pequenos e compostos.
- **Formulários**: react-hook-form + zod + `zodResolver`; schema como fonte da
  verdade (`z.infer`); erros próximos ao campo, mensagens em pt-br.
- **Auth**: estado via `auth-context`/`useAuth`; sem `localStorage` direto;
  respeito a `hasRole`/`canWrite` e à impersonação.
- **Acessibilidade**: primitivos Radix, labels e `aria-*`.
- **Testes**: cobertura para o que mudou; Testing Library por role/label; API
  mockada (`vi.mock` de `@/lib/api/http`), sem rede real; testes ao lado do código.
- **Segurança**: sem segredos no código; validar entradas em boundaries; evitar
  `dangerouslySetInnerHTML`; atenção a injeção/XSS e ao OWASP Top 10.
- **Duplicação**: extrair hooks (`src/hooks`), helpers (`src/lib`) ou componentes.

### 4. Emitir o parecer
Estruture o resultado por severidade, sempre com link para arquivo/linha e
sugestão concreta de correção:

- **🔴 Bloqueadores** — bugs, falhas de lint/teste/tipo, riscos de segurança,
  violações das regras invioláveis (ex.: editar `routeTree.gen.ts`, `fetch` fora
  de `src/lib/api`, `any`).
- **🟡 Melhorias** — duplicação, padrões fora da convenção, falta de testes,
  acessibilidade, nomenclatura.
- **🟢 Observações** — sugestões opcionais, nitpicks, elogios.

Se nada relevante for encontrado em uma categoria, diga explicitamente.
Seja específico e objetivo: aponte o problema, o porquê e como corrigir.

## Referências
- Convenções do projeto: `.github/copilot-instructions.md`
- Regras de rotas: `src/routes/README.md`
- Checklist detalhado: [checklist.md](./checklist.md)
