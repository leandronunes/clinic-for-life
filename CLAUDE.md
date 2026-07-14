# Clinic for Life — Frontend

React 19 + TypeScript estrito consumindo a API Rails de `../clinic-for-life-backend`.

## Stack

- React 19 + TypeScript (`strict`)
- TanStack Start (SSR) + TanStack Router (file-based routing)
- TanStack Query para data fetching e cache
- Vite 7, Tailwind CSS v4, shadcn/ui (Radix UI), `cn` de `@/lib/utils`
- react-hook-form + zod + `@hookform/resolvers`
- lucide-react, sonner, recharts, date-fns
- Vitest + Testing Library + jest-dom

## Regras obrigatórias — sempre seguir

### TypeScript
- **Proibido `any`** (explícito ou implícito). Use tipos precisos ou `unknown` + narrowing.
- Tipe props, retornos de função e payloads de API.
- `import type { ... }` para imports apenas de tipos.
- Alias **`@/*`** em todos os imports; nunca caminhos relativos profundos (`../../../`).
- Prefira `interface`/`type` nomeados; derive tipos de zod com `z.infer`.
- Sem `as` exceto em narrowing justificado; nada de `// @ts-ignore`.

### Componentes
- Apenas **componentes funcionais** com tipagem explícita de props — nunca classes, nunca `React.FC`.
- Reutilize `src/components/ui` (shadcn/ui) antes de criar novos.
- Combine classes com `cn`; nunca concatene strings de classe manualmente.
- Componentes pequenos e compostos; extraia lógica para hooks.
- Siga as **regras de hooks** (ESLint `react-hooks` ativo): sem hooks condicionais, em loops ou após `return`.
- Trate sempre estados de carregamento, erro e vazio na UI.
- Acessibilidade: use primitivos Radix, `aria-*` e labels.

### Data fetching
- **Todo acesso à API** via TanStack Query (`useQuery`/`useMutation`) — nunca `fetch` solto em componentes.
- **Todas as chamadas HTTP** pelo cliente central `@/lib/api/http` (resolve base URL, injeta `Authorization`, desembrulha `{ data, meta }`, normaliza `ApiError`).
- `queryKey`s estáveis e descritivas em array (ex.: `["alunos", { page }]`).
- Invalide queries relacionadas com `queryClient.invalidateQueries` após mutations.

### Formulários
- react-hook-form + schema zod + `zodResolver`.
- O schema zod é a **fonte única da verdade**; tipo derivado com `z.infer`.
- Erros de validação próximos ao campo; mensagens em **pt-br**.

### Autenticação
- Estado de sessão via `useAuth` de `@/contexts/use-auth` — **nunca** acesse `localStorage` diretamente em componentes.
- Respeite `hasRole`, `canWrite` e a lógica de impersonação de aluno.

### Roteamento (TanStack Router — file-based)
- Cada `.tsx` em `src/routes/` é uma rota; use `createFileRoute(...)` e `<Outlet />` em layouts.
- Parâmetros dinâmicos com `$` puro (ex.: `$id`).
- **`src/routeTree.gen.ts` é gerado automaticamente — nunca edite à mão.**
- Nenhuma convenção de Next.js/Remix (`pages/`, `app/layout.tsx`, `server-only`).
- Módulos server-only terminam em `*.server.ts`.

### Testes
- **Sempre gere testes** junto com o código novo/alterado, no mesmo diretório (`*.test.ts` / `*.test.tsx`).
- Vitest + Testing Library; selecione por role/label — nunca por detalhes de implementação.
- **Mocke a camada de API** com `vi.mock("@/lib/api/http")`; sem chamadas de rede reais.
- Para componentes com React Query, envolva em `QueryClientProvider` de teste com retries desativados.
- Cubra estados de sucesso, carregamento, erro e vazio.
- `npm run test` deve passar antes de concluir.

### Qualidade
- `npm run lint` deve passar antes de concluir.
- Sem código duplicado — extraia hooks (`src/hooks`), helpers (`src/lib`) ou componentes.
- Domínio em **pt-br** (labels, mensagens ao usuário); identificadores de código em inglês.
- Sem segredos no código; URL da API via `VITE_API_BASE_URL`.
- Sem `dangerouslySetInnerHTML`; validar entradas em boundaries; atenção a XSS/injeção (OWASP Top 10).

## Integração com o backend

- A API responde em `{ data, meta }` e erros em `{ error: ... }` — já tratados pelo cliente HTTP.
- Configure via `VITE_API_BASE_URL` (default `http://127.0.0.1:3002`).
- Mantenha os tipos do frontend alinhados aos serializers do backend Rails.

## Contract testing (Pact)

- Este frontend é **consumer**. Ver `docs/pact.md` para arquitetura, como rodar, como adicionar um novo contrato e como depurar falhas.
- **Ao adicionar/alterar chamada em `src/lib/api/*.ts`, adicione/atualize o `*.pact.test.ts` correspondente** no mesmo PR, e registre o provider state equivalente no backend.
- `npm run test:pact` — nunca roda dentro de `npm run test` (suítes separadas, ver `vitest.pact.config.ts`).

## Testes E2E (Playwright)

- Ver `docs/e2e.md` para arquitetura, contas de demonstração e como adicionar um novo teste.
- Roda contra o modo offline (`VITE_OFFLINE=true`, mock em `@/lib/api/mock`) — não depende do backend Rails nem de rede.
- `npm run test:e2e` — nunca roda dentro de `npm run test` (Playwright, não Vitest; ver `test.exclude` em `vite.config.ts`).
- `getByText`/`getByLabel` do Playwright fazem substring match case-insensitive por padrão — use `{ exact: true }` ou escopo (`page.getByRole("main")`) para textos curtos que colidem com nav/outros elementos.

## Deploy em produção

- Ver `docs/deploy.md` para o fluxo completo, secrets necessários e rollback.
- Produção **não** é publicada por push em `main` — só por GitHub Release (`gh release create ...`), que dispara `.github/workflows/release.yml`.
- Esse workflow confere se o commit da release tem todo o CI verde antes de acionar o Deploy Hook do Render — não há branch protection nativa na `main` (repositório privado no plano free), então esse é o gate real.

## Controle de versão

Quando estiver executando em um ambiente com Git local e GitHub CLI:

- Nunca faça `git commit` ou `git push` sem autorização expressa do usuário.
- Commit e push devem ocorrer por Pull Request.
- Nunca faça push direto para `main`.
- **Toda mensagem de commit deve ser escrita em inglês**, independentemente do idioma usado na conversa.

Quando estiver executando no Lovable:

- Utilize o mecanismo nativo de sincronização do Lovable com o GitHub.
- Não bloqueie a sincronização automática do projeto.
- As regras de branch e Pull Request serão aplicadas posteriormente pelo fluxo de CI/CD.

## Comandos úteis

```bash
npm run dev          # dev server
npm run lint         # ESLint + Prettier
npm run test         # Vitest (CI)
npm run test:watch   # Vitest interativo
npm run test:coverage
npm run test:pact    # contratos Pact — ver docs/pact.md
npm run test:e2e      # Playwright — ver docs/e2e.md
npm run test:e2e:ui   # Playwright em modo UI interativo
```
