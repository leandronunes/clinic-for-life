# Contract Testing (Pact) — Frontend / Consumer

Este frontend é **consumer** dos contratos verificados pelo backend
(`clinic-for-life-backend`, repo irmão). Cada `*.pact.test.ts` chama o módulo
real de `src/lib/api/*.ts` contra um mock server HTTP local (não contra
`vi.mock`), gerando um arquivo de contrato (`pacts/*.json`) que descreve
exatamente o formato de cada requisição/resposta esperado.

Ver `../clinic-for-life-backend/docs/pact.md` para a arquitetura completa e o
lado da verificação.

## Como rodar localmente

```bash
npm run test:pact          # roda uma vez, gera/atualiza pacts/*.json
npm run test:pact:watch    # modo watch
```

Diferente de `npm run test` (suíte principal, mockada, roda em `jsdom`):
`test:pact` roda em Node puro (sem DOM), sobe um mock server HTTP real por
teste, e nunca é pego pelo `npm run test` — ver `vite.config.ts`'s
`test.exclude` e `vitest.pact.config.ts`.

`pacts/` é gerado e gitignored — cada run recria do zero. Para verificar
contra o backend localmente:

```bash
npm run test:pact
cd ../clinic-for-life-backend
PACT_URL="../clinic-for-life/pacts/clinic-for-life-clinic-for-life-backend.json" \
  bundle exec rake pact:verify
```

## Como rodar no CI

Dois jobs em `.github/workflows/ci.yml`:

- **`contract_test`** — roda em todo PR/push, gera os pacts, nunca toca o
  Broker (feedback rápido de que a mudança não quebrou nenhuma interação já
  gravada).
- **`pact_publish`** — só em push para `main`, publica os pacts no Broker
  (`PACT_BROKER_BASE_URL`/`PACT_BROKER_TOKEN` como secrets do repositório).
  Não roda em PR de propósito, para não poluir o Broker com versões de
  branches descartáveis.

## Como adicionar um novo contrato

1. Escolha (ou crie) `src/lib/api/<dominio>.pact.test.ts`, ao lado do módulo
   real (`<dominio>.ts`) e do seu teste unitário mockado (`<dominio>.test.ts`)
   — mesma convenção de colocar testes perto do código, só com sufixo
   diferente para não ser pego pela suíte principal.
2. Use os helpers compartilhados:
   ```ts
   import { bearerToken } from "@/lib/pact/auth-fixtures";
   import { idString, enumString, iso8601DateTime, errorStringBody, ... } from "@/lib/pact/matchers";
   import { createPact, withMockServerEnv } from "@/lib/pact/setup";
   ```
3. Estrutura padrão de cada teste:
   ```ts
   it("descrição do cenário", async () => {
     const pact = createPact();
     pact
       .given("nome do provider state — precisa bater 100% com o backend")
       .uponReceiving("descrição da interação")
       .withRequest({ method: "GET", path: "/api/v1/...", headers: { Authorization: bearerToken() } })
       .willRespondWith({ status: 200, headers: {...}, body: { data: ... } });

     await pact.executeTest(async (mockServer) => {
       await withMockServerEnv(mockServer.url, async () => {
         const result = await suaFuncaoDoModulo(...);
         expect(result).toBeDefined();
       });
     });
   });
   ```
4. No backend, registre o provider state correspondente — ver
   `../clinic-for-life-backend/docs/pact.md`, seção "Como adicionar um novo
   contrato". A string em `.given(...)` precisa ser **idêntica** à string em
   `provider_state "..."` do lado Ruby.
5. Rode `npm run test:pact` até passar, depois verifique contra o backend
   (comando acima) antes de dar como concluído.

### Vocabulário de matchers (`src/lib/pact/matchers.ts`)

| Situação | Use |
|---|---|
| IDs (bigserial-como-string, ex. `"42"`) | `idString()` — **nunca** `MatchersV3.uuid()`, não são UUIDs |
| Enum fechado (`role`, `status`, `category`...) | `enumString(["a","b"], "a")` — não `like()`/`string()` solto, que aceitaria qualquer string |
| `datetime`/`.iso8601` | `iso8601DateTime()` |
| `date`/`.to_date.iso8601` | `iso8601Date()` |
| Campo nullable presente na resposta | `nullValue()` quando o cenário realmente não popula o campo, ou o matcher do tipo quando popula — **confira o que o provider state realmente cria**, ver "Erros comuns" abaixo |
| Array que pode ter 0+ itens | `eachLike(template, min)` — nunca array literal `[x]` (isso vira checagem de tamanho exato) |
| Array que deve estar vazio | `[]` literal — é o único jeito de expressar "vazio" |
| Erro 422 (`render_unprocessable`) | `errorArrayBody(...)` — sempre array |
| Erro 401/403/404 | `errorStringBody(...)` — sempre string |

### Autenticação

`withMockServerEnv(url, fn, { authenticated: false })` para cenários sem
token (401). Por padrão (`authenticated: true`), registra um token
"fake-mas-com-cara-de-JWT" via `setAuthTokenGetter` — o valor literal não
importa, só o formato (3 segmentos separados por ponto), porque o `bearerToken()`
matcher no `.withRequest(...)` só valida a forma, nunca o conteúdo. Quem
resolve o token *real* durante a verificação é o backend (ver o doc dele).

## Erros comuns ao escrever um novo contrato

- **"Expected a Map with keys [...] but received one with keys [..., extra]"**
  durante a verificação no backend: a função real do módulo manda um campo
  a mais do que o `withRequest` declarou (ex.: `register()` sempre injeta
  `role: "student"`) — inclua esse campo no corpo esperado.
- **"Expected null (Null) to be the same type as '...'"**: o template de
  resposta assume um valor que o provider state do backend não populou.
  Ou ajuste o template para `nullValue()`, ou peça no backend para o state
  criar o registro com esse campo preenchido — o que fizer mais sentido para
  o cenário sendo testado.
- **POST/PUT sem corpo dando 411 na verificação (não aqui)**: é uma
  particularidade do WEBrick usado só durante a verificação no backend — ver
  o doc de lá. Não precisa (e não deve) inventar um corpo falso aqui só para
  contornar.
- **Upload multipart (`withRequestMultipartFileUpload`)**: só consegue
  declarar a parte do arquivo — nenhum outro campo do form fica registrado
  no contrato. Se o endpoint também depende de outro campo do form (ex.
  `student_id`), mande-o **também** como query param no módulo real (Rails
  mescla query+body) e declare `query: {...}` no `withRequest` — ver
  `src/lib/api/bioimpedance-import.ts` e seu `.pact.test.ts` como exemplo.

## Riscos e limitações conhecidas

Mesmas do backend — ver `../clinic-for-life-backend/docs/pact.md`, seção
final. Em resumo: sem Broker configurado ainda (`pact_publish` roda mas o
`pact_verify` do backend não encontra nada até os secrets existirem);
`can-i-deploy` documentado mas não automatizado (nenhum workflow de deploy
ainda); `auth`/`students` são as referências de profundidade máxima, os
demais 12 domínios têm cobertura enxuta (todo endpoint, cenários centrais).
