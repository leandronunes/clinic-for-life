# Checklist de Code Review — Frontend Clinic for Life

Marque cada item ao revisar. Itens com 🔴 são bloqueadores quando violados.

## TypeScript e tipagem
- [ ] 🔴 Sem `any` (explícito ou implícito); use tipos precisos ou `unknown` + narrowing.
- [ ] Props, retornos de função e payloads de API estão tipados.
- [ ] `import type { ... }` quando importar apenas tipos.
- [ ] Tipos do frontend alinhados aos serializers do backend Rails.

## Imports e estrutura
- [ ] Usa alias `@/*`; sem caminhos relativos profundos (`../../../`).
- [ ] 🔴 Não importa `server-only` (usar `*.server.ts`).
- [ ] Arquivos no lugar certo (`src/components`, `src/hooks`, `src/lib`, `src/routes`).

## Roteamento (TanStack Router)
- [ ] 🔴 Não edita `src/routeTree.gen.ts` manualmente.
- [ ] Usa `createFileRoute(...)` e `<Outlet />` em layouts.
- [ ] Params dinâmicos com `$` puro (ex.: `$id`); splat via `_splat`.
- [ ] Módulos que rodam só no servidor terminam em `*.server.ts`.
- [ ] Sem convenções de Next.js/Remix (`pages/`, `app/layout.tsx`).

## Data fetching
- [ ] 🔴 Nenhum `fetch` direto fora de `src/lib/api`; usa `@/lib/api/http`.
- [ ] Acesso à API via TanStack Query (`useQuery`/`useMutation`).
- [ ] `queryKey`s estáveis e descritivas.
- [ ] Invalida queries relacionadas após mutations.
- [ ] Trata `isLoading`, `isError` e estado vazio na UI.
- [ ] Consome corretamente o envelope `{ data, meta }` e `ApiError`.

## Componentes e estilo
- [ ] Reutiliza `src/components/ui` (shadcn/ui) antes de criar novos.
- [ ] Estiliza com Tailwind; combina classes com `cn` (`@/lib/utils`).
- [ ] 🔴 Respeita as regras de hooks (sem hooks condicionais / em loops).
- [ ] Componentes pequenos; lógica extraída para hooks (`src/hooks`).

## Formulários
- [ ] react-hook-form com schema zod + `zodResolver`.
- [ ] Schema é a fonte única da verdade; tipo derivado com `z.infer`.
- [ ] Erros exibidos próximos ao campo, mensagens em pt-br.

## Autenticação
- [ ] Estado de sessão via `auth-context`/`useAuth`.
- [ ] 🔴 Sem acesso direto a `localStorage` para auth em componentes.
- [ ] Respeita papéis (`hasRole`, `canWrite`) e impersonação de aluno.

## Acessibilidade
- [ ] Usa primitivos Radix disponíveis.
- [ ] Labels e atributos `aria-*` presentes; elementos interativos acessíveis por teclado.

## Testes
- [ ] Há testes para a lógica/componentes alterados.
- [ ] Vitest + Testing Library; seleção por role/label.
- [ ] 🔴 API mockada (`vi.mock` de `@/lib/api/http`); sem chamadas de rede reais.
- [ ] Testa comportamento visível, não detalhes de implementação.
- [ ] Testes ao lado do código (`*.test.ts`/`*.test.tsx`).
- [ ] 🔴 `npm run test` passa.

## Qualidade e segurança
- [ ] 🔴 `npm run lint` passa.
- [ ] Sem código duplicado (extrair hook/helper/componente).
- [ ] 🔴 Sem segredos/credenciais no código; URL via `VITE_API_BASE_URL`.
- [ ] Validação de entradas em boundaries; evita `dangerouslySetInnerHTML`.
- [ ] Atenção a XSS/injeção e demais itens do OWASP Top 10.
- [ ] Domínio/labels em pt-br; identificadores de código em inglês quando já é o padrão.
