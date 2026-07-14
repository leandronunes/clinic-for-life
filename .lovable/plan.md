# Assiduidade dos alunos (visão do personal)

Nova tela para o personal/admin acompanhar quantos treinos cada aluno concluiu no ciclo atual e se já estourou a quota contratada.

## Escopo funcional

1. **Campo novo no aluno** — `contracted_workouts_per_cycle` (inteiro, opcional).
   - Editável no formulário de cadastro/edição do aluno.
   - Quando vazio, o aluno aparece na tela como "sem contrato definido" (sem alerta de estouro).

2. **Ciclo baseado em treinos concluídos** (não em datas fixas):
   - Um "ciclo" = os N últimos check-ins concluídos, onde N = quota contratada.
   - Ciclo atual = check-ins concluídos desde o fim do ciclo anterior (quando o aluno bateu a quota, um novo ciclo começa).
   - Cálculo derivado dos `completed_check_ins` já existentes — sem tabela nova de "ciclo".

3. **Nova tela `/assiduidade-alunos`** (menu do personal e admin):
   - Lista todos os alunos ativos do personal (ou todos, se admin).
   - Cada linha mostra:
     - Nome do aluno.
     - Quota contratada (ex.: `12`).
     - Treinos concluídos no ciclo atual (ex.: `9 / 12`).
     - Barra de progresso.
     - Badge de status: `Em dia`, `Próximo do limite` (≥80%), `Estourou` (>quota), `Sem contrato`.
     - Data do último treino concluído.
     - Botão para ver detalhes (abre modal com histórico dos check-ins do ciclo).
   - Filtros: busca por nome, filtro por status.
   - Ordenação por: nome, % concluído, treinos restantes.

4. **Menu**: novo item "Assiduidade" no `AppSidebar` para papéis `admin` e `personal`.

## Detalhes técnicos

### Backend (fora deste repo, precisa acompanhar)
- Migration adicionando `contracted_workouts_per_cycle:integer` em `students`.
- Atualizar `StudentSerializer` e strong params (`create`/`update`) para expor/aceitar o campo.
- Opcional (recomendado): novo endpoint agregador `GET /api/v1/students/attendance_summary` retornando `[{ student_id, name, contracted, completed_current_cycle, last_completed_at }]` para evitar buscar todos os check-ins no cliente.
- Se o endpoint agregador não for criado agora, o frontend calcula a partir de `GET /api/v1/completed_check_ins` + `GET /api/v1/students`.

### Frontend

**Tipos/API**
- `src/lib/api/students.ts`: adicionar `contracted_workouts_per_cycle?: number | null` em `Student` e nos payloads.
- `src/lib/api/attendance.ts` (novo): função `fetchStudentsAttendance()` que:
  - Se endpoint agregador existir, chama direto.
  - Caso contrário, combina `fetchStudents({ status: "active" })` + `fetchCompletedCheckIns()` e calcula ciclo no cliente.
- Lógica pura em `src/lib/attendance-cycle.ts` (com testes):
  - `computeCurrentCycle(completedCheckIns, quota) => { completedInCycle, lastCompletedAt, cyclesFinished }`.
  - Ordena check-ins por `completed_at` desc, agrupa em blocos de tamanho `quota`; o bloco mais recente incompleto é o ciclo atual.

**UI**
- `src/routes/_app.assiduidade-alunos.tsx` (nova rota, protegida para `admin`/`personal`).
- Componente `StudentAttendanceRow` com barra `Progress`, `Badge` de status usando tokens semânticos (`success`, `warning`, `destructive`).
- Modal `StudentCycleDetailsDialog` listando os check-ins do ciclo atual (data, treino, tempo).
- Filtros com `Input` + `Select` do shadcn.
- Estados: loading (skeletons), erro, vazio.

**Formulário do aluno**
- Adicionar campo numérico "Treinos contratados por ciclo" no dialog de cadastro/edição do aluno em `src/routes/_app.usuarios.tsx` (opcional, min 1).

**Sidebar**
- `src/components/AppSidebar.tsx`: adicionar `{ title: "Assiduidade", url: "/assiduidade-alunos", icon: CalendarCheck }` para `admin` e `personal`.

**Testes**
- `src/lib/attendance-cycle.test.ts`: casos com 0 concluídos, ciclo parcial, quota exatamente batida, múltiplos ciclos completos, quota nula.
- `src/lib/api/attendance.test.ts`: mockando `http`.
- `src/routes/-_app.assiduidade-alunos.test.tsx`: renderiza linhas, filtra, mostra badge de estouro.
- Atualizar `src/lib/api/mock/fixtures.ts` para incluir quota em alguns alunos e cobrir o modo offline (E2E).

**E2E**
- `e2e/assiduidade-alunos.spec.ts`: login como personal, abre a tela, verifica um aluno "em dia" e um "estourou".

## Fora de escopo

- Cobrança/pagamento automático quando estoura a quota.
- Renovação automática de contrato.
- Notificação ao aluno quando está perto do limite (pode virar tarefa separada).

## Pergunta pendente

O endpoint agregador no backend Rails eu **não** consigo criar deste repositório (é outro projeto). Posso:

- **(a)** Implementar já com fallback no cliente (busca `completed_check_ins` + `students` e calcula), e você adiciona o endpoint depois quando quiser otimizar; **ou**
- **(b)** Esperar você adicionar `contracted_workouts_per_cycle` no backend antes de eu mexer no frontend.

Confirma qual caminho seguir? (recomendo **a** para você já ver a tela funcionando; o campo `contracted_workouts_per_cycle` no backend ainda precisa ser adicionado para persistir, mas a UI já fica pronta.)
