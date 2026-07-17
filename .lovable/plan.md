## Objetivo

Criar um **Calendário de Treinos Dinâmico** com duas experiências:

- **Aluno**: agenda pessoal (dia/semana/mês) com os treinos programados; cada dia planejado abre a rotina do dia e permite iniciar a execução.
- **Personal**: agenda consolidada de todos os alunos (dia/semana/mês) para visualizar horários ocupados, lacunas e planejar novas aulas recorrentes por aluno (dias da semana + horário por dia + data-fim).

## Escopo do frontend (este repo)

Backend Rails ainda não tem os endpoints de agendamento — vou seguir o padrão já usado em `ciclos de assiduidade` e `contracted_workouts_per_cycle`: implementar tudo no cliente + **mock offline** (`src/lib/api/mock/*`), com o módulo de API pronto para plugar quando o backend expor os endpoints. Sem mudanças no backend nesta entrega.

### Novos arquivos

- `src/lib/api/schedules.ts` — tipos + funções `fetchSchedules`, `createSchedulePlan`, `updateScheduleSession`, `deleteScheduleSession`.
- `src/lib/schedule.ts` — helpers puros: expandir plano recorrente em ocorrências entre duas datas, agrupar por dia/semana/mês, resolver conflitos de horário. Com testes.
- `src/lib/schedule.test.ts`.
- `src/components/agenda/AgendaCalendar.tsx` — componente compartilhado (visão dia/semana/mês, navegação, célula de horário).
- `src/components/agenda/PlanejarAulasDialog.tsx` — form do personal (aluno, dias da semana com horário individual, data-fim, observação).
- `src/routes/_app.aluno.agenda.tsx` — rota do aluno.
- `src/routes/_app.agenda.tsx` — rota do personal/admin.
- Testes correspondentes em `src/routes/-_app.aluno.agenda.test.tsx` e `src/routes/-_app.agenda.test.tsx`.

### Arquivos alterados

- `src/components/AppSidebar.tsx` — adicionar item "Agenda" para `aluno`, `personal` e `admin` (com `CalendarDays` icon), atrás de feature flag `agendaCalendar`.
- `src/lib/feature-flags.ts` — nova flag `agendaCalendar` (default `true` no dev/mock, respeitando padrão dos outros).
- `src/lib/api/mock/store.ts` + `src/lib/api/mock/fixtures.ts` — seed de sessões planejadas para os alunos demo (ex.: seg/qua/sex 07:00 por 8 semanas).
- `src/lib/api/mock/router.ts` — handlers para `GET/POST/PATCH/DELETE /api/v1/schedule_sessions` e `POST /api/v1/schedule_plans`.

### Modelo de dados (cliente + mock)

```ts
type ScheduleSession = {
  id: string;
  student_id: string;
  student_name: string;
  trainer_id: string;
  starts_at: string; // ISO, com timezone local
  duration_minutes: number;
  status: "planned" | "done" | "missed" | "canceled";
  workout_id?: string | null;
  notes?: string | null;
  plan_id?: string | null;
};

type SchedulePlan = {
  student_id: string;
  weekdays: Array<{ weekday: 0|1|2|3|4|5|6; time: string; duration_minutes: number }>;
  starts_on: string; // YYYY-MM-DD
  ends_on: string;   // YYYY-MM-DD
  notes?: string;
};
```

`POST /schedule_plans` expande no servidor (mock) uma sessão por ocorrência entre `starts_on` e `ends_on`.

### UX por perfil

**Aluno (`/aluno/agenda`)**
- Toggle Dia / Semana / Mês + navegação anterior/próximo + "Hoje" (mesmo padrão da tela de Assiduidade).
- Dia: lista cronológica dos treinos do dia com CTA **Abrir treino do dia** → navega para `/aluno?workout=<id>`. Estado do dia: planejado / concluído / perdido.
- Semana: grade 7 colunas × faixas horárias (6h–22h) com blocos coloridos por status.
- Mês: calendário com pontinhos por dia (cor = status agregado).

**Personal/Admin (`/agenda`)**
- Mesma alternância Dia/Semana/Mês.
- Semana é a visão principal: grade com todos os alunos consolidados, blocos mostrando `HH:mm • Nome do aluno`. Lacunas ficam evidentes visualmente (célula vazia).
- Filtro rápido por aluno; admin vê todos os personais.
- Botão **Planejar aulas** → abre `PlanejarAulasDialog`:
  - Selecionar aluno (autocomplete dos alunos do personal).
  - Checkbox de dias da semana; para cada dia marcado, campo de **horário** e **duração** independentes.
  - Data-fim ("Repetir até").
  - Observação.
  - Preview do número total de sessões que serão criadas.
- Clicar num bloco existente abre popover com: aluno, horário, status, botões **Cancelar sessão** e **Ir para o treino**.
- Detecção de conflito de horário no submit (aviso visual, não bloqueia).

### Regras técnicas seguidas

- TanStack Query com `queryKey: ["schedule", { scope, from, to, trainerId?, studentId? }]`.
- Todas as chamadas HTTP passam por `@/lib/api/http`.
- react-hook-form + zod no form de planejamento (mensagens em pt-br).
- Componentes shadcn/ui já existentes (Dialog, Popover, Select, Tabs, Calendar).
- Testes cobrindo: expansão do plano recorrente, render das três visões, submit do planejamento (sucesso e conflito), navegação para o treino do dia.
- `npm run lint` e `npm run test` (arquivos alterados) verdes antes de encerrar.

### Fora de escopo agora

- Endpoints reais no backend Rails (documento à parte na entrega).
- Notificações push do dia de treino (reuso futuro do `use-push-notifications`).
- Arrastar-e-soltar sessões no calendário do personal (v2).
- Sincronização com Google/Apple Calendar (v2).

Posso seguir com essa implementação?
