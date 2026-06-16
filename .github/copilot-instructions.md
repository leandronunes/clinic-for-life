# Clinic for Life — Frontend

Aplicação web da clínica (área do aluno, dashboard, parceiros, avaliações). Consome a
API Rails 8 do projeto `clinic-for-life-backend`.

## Stack

- **React 19** + **TypeScript** (modo `strict`)
- **TanStack Start** (SSR/full-stack) + **TanStack Router** (roteamento por arquivos)
- **TanStack Query** para data fetching e cache de servidor
- **Vite 7** como bundler/dev server
- **Tailwind CSS v4** + **shadcn/ui** (componentes em `src/components/ui`, baseados em Radix UI)
- **react-hook-form** + **zod** (via `@hookform/resolvers`) para formulários e validação
- **lucide-react** (ícones), **sonner** (toasts), **recharts** (gráficos), **date-fns** (datas)
- **Vitest** + **Testing Library** + **jest-dom** para testes
- **ESLint** + **Prettier** para lint/formatação

## Convenções gerais

Sempre:
- **Gerar testes** para a lógica e os componentes que criar/alterar.
- **Evitar código duplicado** — extraia hooks, helpers (`src/lib`) e componentes reutilizáveis.
- Escrever em **TypeScript estrito**: sem `any`; tipe props, retornos e payloads de API.
- Usar o alias de import **`@/*`** (ex.: `@/lib/api/http`), nunca caminhos relativos profundos (`../../../`).
- Usar **`type` imports** quando importar apenas tipos (`import type { ... }`).
- Manter o **domínio em português** (nomes de telas, labels, mensagens ao usuário em pt-br), mas código/identificadores em inglês quando já for o padrão do arquivo.
- Rodar `npm run lint` e `npm run test` antes de concluir uma mudança.

## Roteamento (TanStack Router — file-based)

Leia `src/routes/README.md` antes de mexer em rotas. Pontos-chave:

- Cada arquivo `.tsx` em `src/routes/` é uma rota. **Não** crie `src/pages/`, `app/layout.tsx`
  ou outras convenções de Next.js/Remix.
- Use `createFileRoute(...)` para rotas e `<Outlet />` em layouts.
- Parâmetros dinâmicos usam `$` puro (ex.: `_app.alunos.$id.tsx` → `/alunos/:id`).
- O único shell raiz é `src/routes/__root.tsx`.
- **`src/routeTree.gen.ts` é gerado automaticamente — nunca edite à mão.**
- Módulos que rodam só no servidor devem terminar em `*.server.ts`.

## Data fetching

- Use **TanStack Query** (`useQuery`/`useMutation`) para todo acesso à API; não dispare `fetch`
  solto dentro de componentes.
- **Todas as chamadas HTTP passam pelo cliente central** `src/lib/api/http.ts`, que já:
  resolve a base URL (`VITE_API_BASE_URL`), injeta `Authorization: Bearer <token>`, desembrulha
  o envelope `{ data, meta }` do Rails e normaliza erros para `{ status, message }`.
- Defina `queryKey`s estáveis e descritivas; invalide queries relacionadas após mutations.
- Trate estados de `isLoading`, `isError` e vazio na UI.

## Componentes e estilo

- Reutilize os componentes de `src/components/ui` (shadcn/ui) antes de criar novos.
- Componha estilos com **Tailwind**; combine classes com o helper `cn` (`@/lib/utils`).
- Prefira **componentes funcionais pequenos** e composição; extraia lógica para hooks (`src/hooks`).
- Siga as **regras de hooks do React** (o ESLint `react-hooks` está ativo) — sem hooks condicionais.
- Acessibilidade: use os primitivos Radix já disponíveis e mantenha labels/`aria-*`.

## Formulários

- Use **react-hook-form** com schema **zod** + `zodResolver`.
- Defina o schema como fonte única da verdade e derive o tipo com `z.infer`.
- Exiba erros de validação próximos ao campo; mensagens em pt-br.

## Autenticação

- O estado de sessão vive em `src/contexts/auth-context.tsx` (persistido em `localStorage`).
- O token é fornecido ao cliente HTTP via `setAuthTokenGetter`; não acesse `localStorage`
  diretamente em componentes — use o `useAuth`/contexto.
- Respeite papéis (`hasRole`, `canWrite`) e a lógica de impersonação de aluno ao proteger ações.

## Testes

- Framework: **Vitest** (`environment: jsdom`, `globals: true`, setup em `src/test/setup.ts`).
- Use **Testing Library** (`render`, `screen`, `userEvent`) e asserções `jest-dom`.
- Teste **comportamento visível ao usuário**, não detalhes de implementação; selecione por
  role/label sempre que possível.
- Mocke a camada de API (`@/lib/api/http`) com `vi.mock`; não faça chamadas de rede reais.
- Coloque testes ao lado do código (`*.test.ts`/`*.test.tsx`) seguindo o padrão existente
  (ex.: `src/lib/api/http.test.ts`).
- Comandos: `npm run test` (CI), `npm run test:watch`, `npm run test:coverage`.

## Integração com o backend Rails

- A API responde no envelope `{ data, meta }` e erros em `{ error: ... }` — já tratados pelo
  cliente HTTP; consuma os tipos `Envelope<T>` e `ApiError`.
- Configure a URL da API via `VITE_API_BASE_URL` (default `http://127.0.0.1:3002`).
- Mantenha os tipos do frontend alinhados aos serializers do backend.

## O que evitar

- Editar `routeTree.gen.ts` manualmente.
- `fetch` direto fora de `src/lib/api`.
- Acesso direto a `localStorage` para auth fora do contexto.
- Convenções de Next.js/Remix (`pages/`, `app/`, `server-only`).
- Introduzir `any`, lógica duplicada ou componentes sem teste.
