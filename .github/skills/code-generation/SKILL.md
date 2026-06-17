---
name: code-generation
description: 'Regras para geração de código no frontend Clinic for Life (React 19 + TypeScript estrito, TanStack Query, Vitest). Use quando o usuário pedir para "criar componente", "gerar código", "criar hook", "adicionar tela/página", "escrever feature", "consumir API/endpoint", "criar formulário" ou "gerar testes". Define padrões para componentes funcionais, hooks, React Query (TanStack Query), TypeScript e testes.'
argument-hint: 'O que gerar (ex.: "componente de card de aluno", "hook useAlunos com React Query", "tela de parceiros")'
---

# Geração de Código — Frontend Clinic for Life

Padrões obrigatórios ao criar ou alterar código neste projeto React. Sempre
gere código + testes juntos, sem `any`, sem duplicação, usando o alias `@/*`.
Consulte também `.github/copilot-instructions.md` para o contexto geral.

## Quando usar

- Criar componentes, telas/rotas, hooks ou helpers.
- Consumir endpoints da API (queries/mutations).
- Criar formulários com validação.
- Gerar testes para o que foi criado/alterado.

## 1. Componentes funcionais

- Apenas **componentes funcionais** com arrow/function e tipagem explícita de props
  via `interface`/`type` — nunca classes.
- Componentes **pequenos e compostos**; extraia subcomponentes e mova lógica para hooks.
- Reutilize `src/components/ui` (shadcn/ui) antes de criar novos; combine classes com
  `cn` (`@/lib/utils`), não concatene strings de classe manualmente.
- Sem `React.FC`; declare props diretamente:

```tsx
interface AlunoCardProps {
  aluno: Aluno;
  onSelect?: (id: string) => void;
}

export function AlunoCard({ aluno, onSelect }: AlunoCardProps) {
  return (
    <button type="button" onClick={() => onSelect?.(aluno.id)} className={cn("rounded-lg p-4")}>
      {aluno.nome}
    </button>
  );
}
```

- Acessibilidade: use primitivos Radix já disponíveis, `aria-*` e labels.
- Trate sempre estados de carregamento, erro e vazio na UI.

## 2. Hooks

- **Siga as regras de hooks** (ESLint `react-hooks` ativo): nunca condicionais,
  em loops ou após `return`.
- Extraia lógica reutilizável para hooks em `src/hooks` (`use-*.tsx`/`ts`); um hook
  por responsabilidade, com retorno tipado.
- Memoize com `useMemo`/`useCallback` apenas quando houver custo real ou dependência
  de identidade; não otimize prematuramente.
- Para sessão/auth, use `useAuth` (de `@/contexts/auth-context`) — **nunca** acesse
  `localStorage` direto em componentes.

```ts
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return { on, toggle } as const;
}
```

## 3. React Query (TanStack Query)

- **Todo acesso à API** passa por hooks com `useQuery`/`useMutation`; não chame
  `fetch` solto em componentes.
- **Todas as chamadas HTTP** usam o cliente central `@/lib/api/http` (resolve base URL,
  injeta `Authorization`, desembrulha `{ data, meta }`, normaliza erros `ApiError`).
- `queryKey`s **estáveis e descritivas**, em array (ex.: `["alunos", { page }]`).
- Após mutations, **invalide** as queries relacionadas com `queryClient.invalidateQueries`.
- Tipe `data`, variáveis e erro (`ApiError`); exponha `isLoading`/`isError`.
- Coloque os hooks de dados perto da feature ou em `src/lib/api`/`src/hooks`.

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import type { ApiError } from "@/lib/api/http";

const alunosKeys = {
  all: ["alunos"] as const,
  list: (page: number) => ["alunos", { page }] as const,
};

export function useAlunos(page: number) {
  return useQuery<Aluno[], ApiError>({
    queryKey: alunosKeys.list(page),
    queryFn: () => http.get<Aluno[]>("/alunos", { params: { page } }),
  });
}

export function useCreateAluno() {
  const queryClient = useQueryClient();
  return useMutation<Aluno, ApiError, CreateAlunoInput>({
    mutationFn: (input) => http.post<Aluno>("/alunos", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alunosKeys.all }),
  });
}
```

## 4. TypeScript

- **Modo estrito**: proibido `any` (explícito ou implícito); use tipos precisos ou
  `unknown` + narrowing.
- Tipe props, retornos de função e payloads de API; mantenha os tipos alinhados aos
  serializers do backend Rails.
- Use **`import type`** para imports somente de tipos.
- Use o alias **`@/*`**; nunca caminhos relativos profundos (`../../../`).
- Prefira `type`/`interface` nomeados a tipos inline repetidos; derive tipos de zod
  com `z.infer` quando houver schema.
- Evite asserções `as` exceto em narrowing justificado; nada de `// @ts-ignore`.

### Formulários (quando aplicável)
- `react-hook-form` + `zod` + `zodResolver`; o schema zod é a **fonte única da verdade**
  e o tipo vem de `z.infer`. Mensagens de validação em pt-br, próximas ao campo.

## 5. Testes

- **Sempre gere testes** junto com o código novo/alterado, ao lado do arquivo
  (`*.test.ts`/`*.test.tsx`).
- **Vitest** (`globals: true`, jsdom) + **Testing Library** (`render`, `screen`,
  `userEvent`) e asserções `jest-dom`.
- Teste **comportamento visível ao usuário**, selecionando por role/label; não teste
  detalhes de implementação.
- **Mocke a camada de API** (`vi.mock("@/lib/api/http")`); nunca faça rede real.
- Para hooks/componentes com React Query, envolva em um `QueryClientProvider` de teste
  (novo `QueryClient` com retries desativados) ou um helper `renderWithProviders`.
- Cubra estados de **sucesso, carregamento, erro e vazio**.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api/http", () => ({ http: { get: vi.fn() } }));

describe("AlunoCard", () => {
  it("dispara onSelect com o id ao clicar", async () => {
    const onSelect = vi.fn();
    render(<AlunoCard aluno={{ id: "1", nome: "Ana" }} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Ana" }));
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});
```

## Antes de concluir
- [ ] Sem `any`, sem duplicação, imports com `@/*` e `import type` onde cabe.
- [ ] Acesso à API só via React Query + `@/lib/api/http`; `queryKey`s estáveis.
- [ ] Testes gerados e cobrindo os estados relevantes.
- [ ] Rodar `npm run lint` e `npm run test` — ambos devem passar.

## Referências
- Convenções gerais: `.github/copilot-instructions.md`
- Regras de rotas: `src/routes/README.md`
- Cliente HTTP: `src/lib/api/http.ts`
