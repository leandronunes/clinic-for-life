# Chat 1:1 — Especificação para o Backend Rails

Documento de contrato para implementar no backend (`../clinic-for-life-backend`) os endpoints já consumidos pelo frontend em `src/lib/api/chat.ts` e espelhados no mock offline (`src/lib/api/mock/router.ts` e `store.ts`). O frontend está pronto — basta expor esses endpoints com as mesmas formas de payload.

## Visão geral

- Conversa **1:1** entre um `personal` e um `aluno`. Não há grupos.
- A conversa é **identificada pelo `student_id`**. O par (aluno, personal) é derivado do `trainer_id` do aluno.
- Mensagens são **somente texto** (com emojis Unicode). Sem anexos nesta primeira versão.
- Polling no cliente: `GET messages` a cada 5s; `GET conversations` a cada 10s. Não é preciso WebSocket agora — implementar como REST puro.

## Modelo de dados

### `chat_messages`

| Coluna        | Tipo                                | Notas                                    |
| ------------- | ----------------------------------- | ---------------------------------------- |
| `id`          | `bigserial` PK                      | serializar como string (`.to_s`)         |
| `student_id`  | `bigint` FK → `students.id`         | índice; identifica a conversa            |
| `sender_role` | `enum('personal','aluno')`          | pode ser string check-constraint         |
| `sender_id`   | `bigint`                            | `users.id` do autor (personal ou aluno)  |
| `body`        | `text`                              | obrigatório, `1..4000` chars após strip  |
| `read_at`     | `timestamptz` nullable              | quando o destinatário marcou como lida   |
| `created_at`  | `timestamptz`                       | default `now()`                          |
| `updated_at`  | `timestamptz`                       |                                          |

Índices:
- `(student_id, created_at)` — listagem cronológica.
- `(student_id, read_at)` — contagem de não-lidas.

Não há tabela `conversations` — a conversa é derivada por `student_id`. Se preferir materializar (para `updated_at` e `last_message_id` em cache), tudo bem, mas o contrato do JSON abaixo permanece.

## Autorização (Pundit)

- **aluno**: só enxerga/escreve na conversa cujo `student_id == current_user.aluno_id`.
- **personal**: só enxerga/escreve nas conversas de alunos cujo `trainer_id == current_user.id`.
- **admin**: enxerga/escreve em todas.

Retornar `404` (não `403`) para conversas fora do escopo, para não vazar existência.

Ao inserir uma mensagem, o backend define:
- `sender_id = current_user.id`
- `sender_role` a partir do papel do `current_user` na conversa (nunca confiar em input).

## Endpoints

Base: `/api/v1`. Todos exigem `Authorization: Bearer <jwt>`. Respostas seguem o padrão do projeto: `{ data, meta }` em sucesso e `{ error: ... }` em erro (o cliente HTTP em `src/lib/api/http.ts` desembrulha `data`).

### 1. `GET /chat/conversations`

Lista conversas visíveis para o usuário.

- **aluno**: array com no máximo 1 item (a conversa com o personal).
- **personal**: uma entrada por aluno ativo sob sua responsabilidade — inclusive alunos que ainda não trocaram mensagens (`last_message: null`, `unread_count: 0`).
- **admin**: todas as conversas.

Ordenação sugerida: `updated_at DESC` (data da última mensagem, ou `students.created_at` como fallback).

Resposta (`data`):
```json
[
  {
    "student_id": "12",
    "student_name": "Ana Silva",
    "student_avatar_url": null,
    "trainer_id": "3",
    "trainer_name": "Coach João",
    "last_message": {
      "id": "87",
      "student_id": "12",
      "sender_role": "aluno",
      "sender_id": "12",
      "sender_name": "Ana Silva",
      "body": "Bom dia! 💪",
      "created_at": "2026-07-21T12:30:00Z",
      "read_at": null
    },
    "unread_count": 2,
    "updated_at": "2026-07-21T12:30:00Z"
  }
]
```

`unread_count` = mensagens da conversa com `read_at IS NULL` **cujo `sender_role != papel do current_user`** (o próprio usuário não conta as que ele mesmo enviou).

### 2. `GET /chat/conversations/:student_id/messages`

Retorna todas as mensagens da conversa em ordem cronológica ascendente (mais antiga primeiro). Paginação não é necessária agora; se quiser preparar, aceite `?before=<message_id>&limit=50` opcionais e ignore se ausentes.

Resposta (`data`): array de `ChatMessage` no mesmo shape do `last_message` acima.

### 3. `POST /chat/conversations/:student_id/messages`

Body:
```json
{ "body": "texto com emoji 😄" }
```

Validações:
- `body` obrigatório; após `strip`, `1..4000` chars.
- Rejeitar com `422` + `{ "error": ["Mensagem não pode ficar em branco"] }` seguindo o padrão de `render_unprocessable`.

Efeitos:
- Cria `ChatMessage` com `sender_id/sender_role` derivados do `current_user`.
- `read_at = null`.

Resposta `201`: a `ChatMessage` criada.

### 4. `POST /chat/conversations/:student_id/read`

Marca como lidas **todas** as mensagens da conversa cujo `sender_role != papel do current_user` e `read_at IS NULL`. Preenche `read_at = now()`.

Resposta `200`:
```json
{ "read": 3 }
```

Sempre retornar `200`, mesmo quando `read == 0` — o cliente chama de forma best-effort sempre que abre/atualiza a conversa (ver `ChatWindow.tsx`).

## Erros

Seguir os helpers já usados no projeto:

- `401` → `render_unauthorized` (`{ "error": "Unauthorized" }` — string).
- `404` → `render_not_found` (`{ "error": "Não encontrado" }` — string). Usar também quando o `student_id` existe mas o `current_user` não pode acessar aquela conversa.
- `422` → `render_unprocessable` (`{ "error": ["mensagem 1", "mensagem 2"] }` — array de `full_messages`).

Ver `src/lib/pact/matchers.ts` (`errorStringBody`, `errorArrayBody`) para os shapes esperados nos pacts.

## Pact (consumer-driven)

Ao implementar no backend, adicionar no frontend um `src/lib/api/chat.pact.test.ts` cobrindo:

1. `GET /chat/conversations` — personal com 2 alunos, um com mensagem não-lida.
2. `GET /chat/conversations/:id/messages` — happy path com 2 mensagens.
3. `POST /chat/conversations/:id/messages` — sucesso (`201`) e `422` com body vazio.
4. `POST /chat/conversations/:id/read` — sucesso com contagem.
5. `404` para `student_id` fora do escopo do current_user.

Provider states equivalentes no backend (`spec/pact/`):
- `"personal com 2 alunos, uma conversa com 1 mensagem não lida"`
- `"conversa com student_id X existe e tem 2 mensagens"`
- `"student_id X existe mas não pertence ao current_user"`

## Contrato TypeScript (fonte)

Cópia do `src/lib/api/chat.ts` — os tipos são a fonte da verdade para os serializers Rails:

```ts
export type ChatSenderRole = "personal" | "aluno";

export interface ChatMessage {
  id: string;
  student_id: string;
  sender_role: ChatSenderRole;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;   // ISO8601 UTC "Z"
  read_at: string | null;
}

export interface ChatConversation {
  student_id: string;
  student_name: string;
  student_avatar_url?: string | null;
  trainer_id: string;
  trainer_name: string;
  last_message?: ChatMessage | null;
  unread_count: number;
  updated_at: string;
}
```

## Referência do mock (comportamento canônico)

Se houver dúvida sobre um edge case, o mock offline é o oráculo:
- Handlers HTTP: `src/lib/api/mock/router.ts` (linhas com `"/api/v1/chat/"`).
- Persistência in-memory, contagem de não-lidas e `mark as read`: `src/lib/api/mock/store.ts` (a partir de `chatMessages`).

## Fora de escopo (v2+)

- Anexos (imagens, PDFs).
- WebSocket / ActionCable para push em tempo real (hoje é polling).
- Reações, edição, exclusão de mensagens.
- Busca full-text no histórico.
- Mensagens entre múltiplos personais / grupos.
