/**
 * Mock API — simula respostas de uma API RESTful em Ruby on Rails.
 * Todos os endpoints retornam estruturas no formato { data, meta } como
 * Rails costuma serializar com JSON:API / ActiveModelSerializers.
 * Autenticação via Bearer Token JWT (mockado).
 */

export type UserRole = "admin" | "personal" | "aluno";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  /** Quando role === "personal", aponta para o cadastro Personal correspondente. */
  personal_id?: string;
  /** Quando role === "aluno", aponta para o cadastro Aluno correspondente. */
  aluno_id?: string;
}

export interface AuthSession {
  token: string; // JWT mock
  user: AuthUser;
  expires_at: string;
}

/* -------- "Banco de dados" em memória -------- */

const MOCK_USERS: Array<AuthUser & { password: string }> = [
  {
    id: "u_admin_01",
    name: "Dra. Camila Andrade",
    email: "admin@forlife.app",
    password: "Admin@2026",
    role: "admin",
  },
  {
    id: "u_personal_01",
    name: "Rafael Monteiro",
    email: "personal@forlife.app",
    password: "Personal@2026",
    role: "personal",
    personal_id: "p1",
  },
  {
    id: "u_aluno_01",
    name: "Júlia Ferreira",
    email: "aluno@forlife.app",
    password: "Aluno@2026",
    role: "aluno",
    aluno_id: "a1",
  },
];

/* -------- JWT mock -------- */
function b64url(obj: unknown) {
  const json = JSON.stringify(obj);
  if (typeof window === "undefined") return Buffer.from(json).toString("base64url");
  return btoa(unescape(encodeURIComponent(json))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function signMockJwt(user: AuthUser): string {
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  });
  // assinatura simulada — em produção, gerada pelo Rails
  const signature = b64url({ s: `mock_${user.id}` });
  return `${header}.${payload}.${signature}`;
}

/* -------- Latência simulada -------- */
const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));

/* -------- Endpoints -------- */

export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  await wait(700);
  const found = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!found) {
    const err: { status: number; message: string } = { status: 401, message: "Credenciais inválidas" };
    throw err;
  }
  const { password: _pw, ...user } = found;
  return {
    token: signMockJwt(user),
    user,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

/* -------- Domain mocks -------- */

export interface DashboardKpi {
  label: string;
  value: number;
  delta: number; // % vs período anterior
  icon: "users" | "trainer" | "handshake" | "clipboard" | "dumbbell";
}

export type RangeFilter = "day" | "week" | "month" | "year";

export async function apiDashboardKpis(range: RangeFilter): Promise<DashboardKpi[]> {
  await wait(350);
  const multiplier = { day: 0.4, week: 0.7, month: 1, year: 3.2 }[range];
  return [
    { label: "Alunos Ativos", value: Math.round(284 * multiplier), delta: 12.4, icon: "users" },
    { label: "Personais", value: Math.round(18 * (range === "year" ? 1.3 : 1)), delta: 4.1, icon: "trainer" },
    { label: "Parceiros", value: Math.round(9 * (range === "year" ? 1.4 : 1)), delta: 1.2, icon: "handshake" },
    { label: "Avaliações", value: Math.round(132 * multiplier), delta: 8.6, icon: "clipboard" },
    { label: "Treinos Ativos", value: Math.round(241 * multiplier), delta: 5.3, icon: "dumbbell" },
  ];
}

export async function apiActivitySeries(range: RangeFilter) {
  await wait(300);
  const points = { day: 24, week: 7, month: 30, year: 12 }[range];
  const labels = Array.from({ length: points }, (_, i) => {
    if (range === "day") return `${i.toString().padStart(2, "0")}h`;
    if (range === "week") return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i];
    if (range === "year")
      return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i];
    return `${i + 1}`;
  });
  return labels.map((label, i) => ({
    label,
    treinos: Math.round(20 + Math.sin(i / 2) * 8 + Math.random() * 10),
    avaliacoes: Math.round(8 + Math.cos(i / 3) * 4 + Math.random() * 5),
  }));
}

export interface Aluno {
  id: string;
  nome: string;
  nascimento: string;
  sexo: "F" | "M" | "Outro";
  altura_cm: number;
  email: string;
  telefone: string;
  personal_id: string;
  personal_nome: string;
  status: "ativo" | "inativo";
  criado_em: string;
  plano_saude?: string;
  contato_emergencia?: string;
}


export interface Personal {
  id: string;
  nome: string;
  cpf: string;
  cref: string;
  email: string;
  telefone: string;
  status: "ativo" | "bloqueado" | "inativo";
  alunos_count: number;
}

const PERSONAIS: Personal[] = [
  { id: "p1", nome: "Rafael Monteiro", cpf: "123.456.789-00", cref: "012345-G/SP", email: "rafael@forlife.app", telefone: "(11) 98888-1111", status: "ativo", alunos_count: 18 },
  { id: "p2", nome: "Beatriz Lima", cpf: "234.567.890-11", cref: "023456-G/SP", email: "bia@forlife.app", telefone: "(11) 98888-2222", status: "ativo", alunos_count: 22 },
  { id: "p3", nome: "Carlos Eduardo", cpf: "345.678.901-22", cref: "034567-G/SP", email: "cadu@forlife.app", telefone: "(11) 98888-3333", status: "bloqueado", alunos_count: 6 },
  { id: "p4", nome: "Marina Souza", cpf: "456.789.012-33", cref: "045678-G/SP", email: "marina@forlife.app", telefone: "(11) 98888-4444", status: "inativo", alunos_count: 0 },
];

const ALUNOS: Aluno[] = [
  { id: "a1", nome: "Júlia Ferreira", nascimento: "1996-05-12", sexo: "F", altura_cm: 168, email: "julia@email.com", telefone: "(11) 97777-1010", personal_id: "p1", personal_nome: "Rafael Monteiro", status: "ativo", criado_em: "2025-09-12" },
  { id: "a2", nome: "Pedro Augusto", nascimento: "1989-11-03", sexo: "M", altura_cm: 182, email: "pedro@email.com", telefone: "(11) 97777-2020", personal_id: "p1", personal_nome: "Rafael Monteiro", status: "ativo", criado_em: "2025-08-22" },
  { id: "a3", nome: "Ana Carolina", nascimento: "1992-02-28", sexo: "F", altura_cm: 165, email: "ana@email.com", telefone: "(11) 97777-3030", personal_id: "p2", personal_nome: "Beatriz Lima", status: "ativo", criado_em: "2025-07-15" },
  { id: "a4", nome: "Lucas Pereira", nascimento: "2000-07-21", sexo: "M", altura_cm: 178, email: "lucas@email.com", telefone: "(11) 97777-4040", personal_id: "p2", personal_nome: "Beatriz Lima", status: "inativo", criado_em: "2025-04-01" },
  { id: "a5", nome: "Mariana Costa", nascimento: "1985-12-09", sexo: "F", altura_cm: 170, email: "mari@email.com", telefone: "(11) 97777-5050", personal_id: "p1", personal_nome: "Rafael Monteiro", status: "ativo", criado_em: "2026-01-10" },
  { id: "a6", nome: "Rodrigo Alves", nascimento: "1978-03-17", sexo: "M", altura_cm: 175, email: "rod@email.com", telefone: "(11) 97777-6060", personal_id: "p3", personal_nome: "Carlos Eduardo", status: "ativo", criado_em: "2026-02-04" },
];

export async function apiListAlunos(filter?: { personalId?: string }) {
  await wait(300);
  const data = filter?.personalId
    ? ALUNOS.filter((a) => a.personal_id === filter.personalId)
    : [...ALUNOS];
  return { data, meta: { total: data.length } };
}

export async function apiGetAluno(id: string) {
  await wait(250);
  const aluno = ALUNOS.find((a) => a.id === id);
  if (!aluno) throw { status: 404, message: "Aluno não encontrado" };
  return { data: aluno };
}

export async function apiListPersonais() {
  await wait(300);
  return { data: [...PERSONAIS], meta: { total: PERSONAIS.length } };
}

export async function apiSearchPersonais(query: string) {
  await wait(250);
  const q = query.trim().toLowerCase();
  const data = PERSONAIS.filter(
    (p) =>
      p.status === "ativo" &&
      (q === "" ||
        p.nome.toLowerCase().includes(q) ||
        p.cref.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)),
  ).slice(0, 8);
  return { data };
}

export async function apiCreateAluno(payload: Omit<Aluno, "id" | "criado_em" | "personal_nome" | "status">) {
  await wait(500);
  const personal = PERSONAIS.find((p) => p.id === payload.personal_id);
  const novo: Aluno = {
    ...payload,
    id: `a${Date.now()}`,
    personal_nome: personal?.nome ?? "—",
    status: "ativo",
    criado_em: new Date().toISOString().slice(0, 10),
  };
  ALUNOS.unshift(novo);
  if (personal) personal.alunos_count += 1;
  return { data: novo };
}

export async function apiUpdateAluno(id: string, patch: Partial<Omit<Aluno, "id" | "criado_em">>) {
  await wait(400);
  const idx = ALUNOS.findIndex((a) => a.id === id);
  if (idx < 0) throw { status: 404, message: "Aluno não encontrado" };
  const prev = ALUNOS[idx];
  const next: Aluno = { ...prev, ...patch };
  if (patch.personal_id && patch.personal_id !== prev.personal_id) {
    const newP = PERSONAIS.find((p) => p.id === patch.personal_id);
    const oldP = PERSONAIS.find((p) => p.id === prev.personal_id);
    if (newP) {
      next.personal_nome = newP.nome;
      newP.alunos_count += 1;
    }
    if (oldP) oldP.alunos_count = Math.max(0, oldP.alunos_count - 1);
  }
  ALUNOS[idx] = next;
  return { data: next };
}

export async function apiCreatePersonal(payload: Omit<Personal, "id" | "alunos_count">) {
  await wait(500);
  const novo: Personal = { ...payload, id: `p${Date.now()}`, alunos_count: 0 };
  PERSONAIS.unshift(novo);
  return { data: novo };
}

export async function apiUpdatePersonal(id: string, patch: Partial<Omit<Personal, "id" | "alunos_count">>) {
  await wait(400);
  const idx = PERSONAIS.findIndex((p) => p.id === id);
  if (idx < 0) throw { status: 404, message: "Personal não encontrado" };
  const next = { ...PERSONAIS[idx], ...patch };
  PERSONAIS[idx] = next;
  // propagar nome para alunos
  if (patch.nome) {
    ALUNOS.forEach((a) => { if (a.personal_id === id) a.personal_nome = patch.nome!; });
  }
  return { data: next };
}

/* -------- Bioimpedância (InBody CSV) -------- */

export interface BioRow {
  aluno_email: string;
  peso_kg: number;
  massa_muscular_kg: number;
  gordura_pct: number;
  data: string;
}

export interface BioImportResult {
  total: number;
  importados: number;
  erros: Array<{ linha: number; motivo: string }>;
  preview: BioRow[];
}

export async function apiProcessBioimpedanciaCsv(file: File): Promise<BioImportResult> {
  await wait(1400);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Assume primeira linha como cabeçalho
  const rows = lines.slice(1);
  const erros: BioImportResult["erros"] = [];
  const preview: BioRow[] = [];
  const seen = new Set<string>();

  rows.forEach((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 5) {
      erros.push({ linha: i + 2, motivo: "Formato inválido (colunas insuficientes)" });
      return;
    }
    const [email, pesoStr, mmStr, gStr, data] = cols;
    const peso = Number(pesoStr);
    const mm = Number(mmStr);
    const g = Number(gStr);
    if (Number.isNaN(peso) || peso <= 0) {
      erros.push({ linha: i + 2, motivo: `Peso inválido (${pesoStr})` });
      return;
    }
    if (Number.isNaN(mm) || mm <= 0) {
      erros.push({ linha: i + 2, motivo: `Massa muscular inválida (${mmStr})` });
      return;
    }
    if (Number.isNaN(g) || g < 0 || g > 80) {
      erros.push({ linha: i + 2, motivo: `Gordura % fora da faixa (${gStr})` });
      return;
    }
    const dedupKey = `${email}|${data}`;
    if (seen.has(dedupKey)) {
      erros.push({ linha: i + 2, motivo: "Registro duplicado para o aluno na mesma data" });
      return;
    }
    seen.add(dedupKey);
    preview.push({ aluno_email: email, peso_kg: peso, massa_muscular_kg: mm, gordura_pct: g, data });
  });

  return {
    total: rows.length,
    importados: preview.length,
    erros,
    preview: preview.slice(0, 10),
  };
}

/* -------- Validação senha forte -------- */
export function validateStrongPassword(pw: string): string[] {
  const errs: string[] = [];
  if (pw.length < 8) errs.push("mínimo de 8 caracteres");
  if (!/[A-Z]/.test(pw)) errs.push("uma letra maiúscula");
  if (!/[a-z]/.test(pw)) errs.push("uma letra minúscula");
  if (!/[0-9]/.test(pw)) errs.push("um número");
  if (!/[^A-Za-z0-9]/.test(pw)) errs.push("um caractere especial");
  return errs;
}

/* -------- Treinos do Aluno -------- */

/** @deprecated mantido apenas por compatibilidade — treinos agora usam posicao numérica. */
export type TreinoLetra = "A" | "B" | "C";
export type TreinoStatus = "ativo" | "arquivado";

export interface Exercicio {
  id: string;
  nome: string;
  series: number;
  reps: string;
  carga_kg?: number;
  descanso_s: number;
  grupo: string;
  video_url: string; // YouTube embed
  observacao?: string;
}

export interface Treino {
  id: string;
  posicao: number;
  titulo: string;
  foco: string;
  status: TreinoStatus;
  criado_em: string;
  arquivado_em?: string;
  personal_nome: string;
  exercicios: Exercicio[];
}

const YT = (id: string) => `https://www.youtube.com/embed/${id}`;

const TREINOS_ATIVOS: Treino[] = [
  {
    id: "t_a",
    posicao: 1,
    titulo: "Treino A — Peito, Ombro e Tríceps",
    foco: "Empurrar (Push)",
    status: "ativo",
    criado_em: "2026-05-01",
    personal_nome: "Rafael Monteiro",
    exercicios: [
      { id: "e1", nome: "Supino reto com barra", series: 4, reps: "8-10", carga_kg: 40, descanso_s: 90, grupo: "Peito", video_url: YT("rT7DgCr-3pg"), observacao: "Controlar a fase excêntrica em 2s." },
      { id: "e2", nome: "Supino inclinado halteres", series: 3, reps: "10-12", carga_kg: 14, descanso_s: 75, grupo: "Peito", video_url: YT("8iPEnn-ltC8") },
      { id: "e3", nome: "Desenvolvimento militar", series: 4, reps: "8-10", carga_kg: 22, descanso_s: 90, grupo: "Ombro", video_url: YT("qEwKCR5JCog") },
      { id: "e4", nome: "Elevação lateral", series: 3, reps: "12-15", carga_kg: 7, descanso_s: 60, grupo: "Ombro", video_url: YT("3VcKaXpzqRo") },
      { id: "e5", nome: "Tríceps corda na polia", series: 4, reps: "12", carga_kg: 18, descanso_s: 60, grupo: "Tríceps", video_url: YT("vB5OHsJ3EME") },
    ],
  },
  {
    id: "t_b",
    posicao: 2,
    titulo: "Treino B — Costas e Bíceps",
    foco: "Puxar (Pull)",
    status: "ativo",
    criado_em: "2026-05-01",
    personal_nome: "Rafael Monteiro",
    exercicios: [
      { id: "e6", nome: "Puxada frontal", series: 4, reps: "10", carga_kg: 45, descanso_s: 90, grupo: "Costas", video_url: YT("CAwf7n6Luuc") },
      { id: "e7", nome: "Remada curvada", series: 4, reps: "8-10", carga_kg: 35, descanso_s: 90, grupo: "Costas", video_url: YT("vT2GjY_Umpw") },
      { id: "e8", nome: "Remada unilateral halter", series: 3, reps: "10", carga_kg: 18, descanso_s: 75, grupo: "Costas", video_url: YT("pYcpY20QaE8") },
      { id: "e9", nome: "Rosca direta barra W", series: 4, reps: "10-12", carga_kg: 18, descanso_s: 60, grupo: "Bíceps", video_url: YT("kwG2ipFRgfo") },
      { id: "e10", nome: "Rosca alternada banco inclinado", series: 3, reps: "12", carga_kg: 10, descanso_s: 60, grupo: "Bíceps", video_url: YT("soxrZlIl35U") },
    ],
  },
  {
    id: "t_c",
    posicao: 3,
    titulo: "Treino C — Pernas e Core",
    foco: "Membros inferiores",
    status: "ativo",
    criado_em: "2026-05-01",
    personal_nome: "Rafael Monteiro",
    exercicios: [
      { id: "e11", nome: "Agachamento livre", series: 4, reps: "8-10", carga_kg: 50, descanso_s: 120, grupo: "Quadríceps", video_url: YT("ultWZbUMPL8"), observacao: "Profundidade até 90°." },
      { id: "e12", nome: "Leg press 45°", series: 4, reps: "10-12", carga_kg: 120, descanso_s: 90, grupo: "Quadríceps", video_url: YT("IZxyjW7MPJQ") },
      { id: "e13", nome: "Cadeira flexora", series: 3, reps: "12", carga_kg: 30, descanso_s: 60, grupo: "Posterior", video_url: YT("1Tq3QdYUuHs") },
      { id: "e14", nome: "Stiff com halteres", series: 3, reps: "10-12", carga_kg: 18, descanso_s: 75, grupo: "Posterior", video_url: YT("CN_7cz3P-1U") },
      { id: "e15", nome: "Prancha abdominal", series: 3, reps: "45s", descanso_s: 45, grupo: "Core", video_url: YT("ASdvN_XEl_c") },
    ],
  },
];

const TREINOS_ARQUIVADOS: Treino[] = [
  {
    id: "t_arq_1",
    posicao: 1,
    titulo: "Treino A (Mar/2026) — Adaptação",
    foco: "Adaptação geral",
    status: "arquivado",
    criado_em: "2026-03-01",
    arquivado_em: "2026-05-01",
    personal_nome: "Rafael Monteiro",
    exercicios: [
      { id: "ea1", nome: "Supino reto guiado", series: 3, reps: "12", carga_kg: 25, descanso_s: 60, grupo: "Peito", video_url: YT("rT7DgCr-3pg") },
      { id: "ea2", nome: "Puxada frontal", series: 3, reps: "12", carga_kg: 35, descanso_s: 60, grupo: "Costas", video_url: YT("CAwf7n6Luuc") },
    ],
  },
  {
    id: "t_arq_2",
    posicao: 2,
    titulo: "Treino B (Jan/2026) — Hipertrofia inicial",
    foco: "Hipertrofia",
    status: "arquivado",
    criado_em: "2026-01-10",
    arquivado_em: "2026-03-01",
    personal_nome: "Rafael Monteiro",
    exercicios: [
      { id: "eb1", nome: "Agachamento Smith", series: 4, reps: "10", carga_kg: 30, descanso_s: 75, grupo: "Quadríceps", video_url: YT("ultWZbUMPL8") },
    ],
  },
];

export async function apiListTreinos(alunoId: string): Promise<{ ativos: Treino[]; arquivados: Treino[] }> {
  await wait(400);
  void alunoId;
  return { ativos: TREINOS_ATIVOS, arquivados: TREINOS_ARQUIVADOS };
}

export interface NovoTreinoInput {
  titulo: string;
  foco: string;
  personal_nome?: string;
}

export async function apiCreateTreino(alunoId: string, input: NovoTreinoInput): Promise<Treino> {
  await wait(450);
  void alunoId;
  const proxPosicao =
    TREINOS_ATIVOS.reduce((max, t) => (t.posicao > max ? t.posicao : max), 0) + 1;
  const novo: Treino = {
    id: `t_${Math.random().toString(36).slice(2, 8)}`,
    posicao: proxPosicao,
    titulo: input.titulo.trim(),
    foco: input.foco.trim(),
    status: "ativo",
    criado_em: new Date().toISOString().slice(0, 10),
    personal_nome: input.personal_nome ?? "Personal",
    exercicios: [],
  };
  TREINOS_ATIVOS.push(novo);
  return novo;
}

export interface NovoExercicioInput {
  nome: string;
  series: number;
  reps: string;
  carga_kg?: number;
  descanso_s: number;
  grupo: string;
  video_url?: string;
  observacao?: string;
}

export async function apiAddExercicio(treinoId: string, input: NovoExercicioInput): Promise<Exercicio> {
  await wait(400);
  const treino = TREINOS_ATIVOS.find((t) => t.id === treinoId);
  if (!treino) throw new Error("Treino não encontrado");
  const ex: Exercicio = {
    id: `e_${Math.random().toString(36).slice(2, 8)}`,
    nome: input.nome.trim(),
    series: input.series,
    reps: input.reps.trim(),
    carga_kg: input.carga_kg,
    descanso_s: input.descanso_s,
    grupo: input.grupo.trim(),
    video_url: input.video_url?.trim() || YT("rT7DgCr-3pg"),
    observacao: input.observacao?.trim() || undefined,
  };
  treino.exercicios.push(ex);
  return ex;
}

export async function apiUpdateTreino(
  treinoId: string,
  patch: Partial<Pick<Treino, "titulo" | "foco">>,
): Promise<Treino> {
  await wait(350);
  const treino =
    TREINOS_ATIVOS.find((t) => t.id === treinoId) ??
    TREINOS_ARQUIVADOS.find((t) => t.id === treinoId);
  if (!treino) throw new Error("Treino não encontrado");
  if (patch.titulo !== undefined) treino.titulo = patch.titulo.trim();
  if (patch.foco !== undefined) treino.foco = patch.foco.trim();
  return treino;
}

export async function apiArchiveTreino(treinoId: string): Promise<Treino> {
  await wait(350);
  const idx = TREINOS_ATIVOS.findIndex((t) => t.id === treinoId);
  if (idx === -1) throw new Error("Treino não encontrado");
  const [treino] = TREINOS_ATIVOS.splice(idx, 1);
  treino.status = "arquivado";
  treino.arquivado_em = new Date().toISOString().slice(0, 10);
  TREINOS_ATIVOS.forEach((t, i) => { t.posicao = i + 1; });
  treino.posicao =
    TREINOS_ARQUIVADOS.reduce((max, t) => (t.posicao > max ? t.posicao : max), 0) + 1;
  TREINOS_ARQUIVADOS.unshift(treino);
  return treino;
}

export async function apiUpdateExercicio(
  treinoId: string,
  exercicioId: string,
  patch: Partial<NovoExercicioInput>,
): Promise<Exercicio> {
  await wait(300);
  const treino = TREINOS_ATIVOS.find((t) => t.id === treinoId);
  if (!treino) throw new Error("Treino não encontrado");
  const ex = treino.exercicios.find((e) => e.id === exercicioId);
  if (!ex) throw new Error("Exercício não encontrado");
  if (patch.nome !== undefined) ex.nome = patch.nome.trim();
  if (patch.grupo !== undefined) ex.grupo = patch.grupo.trim();
  if (patch.series !== undefined) ex.series = patch.series;
  if (patch.reps !== undefined) ex.reps = patch.reps.trim();
  if (patch.carga_kg !== undefined) ex.carga_kg = patch.carga_kg;
  if (patch.descanso_s !== undefined) ex.descanso_s = patch.descanso_s;
  if (patch.video_url !== undefined) ex.video_url = patch.video_url.trim() || ex.video_url;
  if (patch.observacao !== undefined) ex.observacao = patch.observacao.trim() || undefined;
  return ex;
}

export async function apiDeleteExercicio(treinoId: string, exercicioId: string): Promise<{ id: string }> {
  await wait(250);
  const treino = TREINOS_ATIVOS.find((t) => t.id === treinoId);
  if (!treino) throw new Error("Treino não encontrado");
  const idx = treino.exercicios.findIndex((e) => e.id === exercicioId);
  if (idx === -1) throw new Error("Exercício não encontrado");
  treino.exercicios.splice(idx, 1);
  return { id: exercicioId };
}

/* -------- Evolução física -------- */

export interface EvolucaoPonto {
  data: string; // ISO
  peso_kg: number;
  massa_muscular_kg: number;
  gordura_pct: number;
  imc: number;
}

const EVOLUCAO: EvolucaoPonto[] = [
  { data: "2025-09-01", peso_kg: 72.4, massa_muscular_kg: 28.1, gordura_pct: 31.2, imc: 25.7 },
  { data: "2025-10-01", peso_kg: 71.6, massa_muscular_kg: 28.6, gordura_pct: 30.1, imc: 25.4 },
  { data: "2025-11-01", peso_kg: 70.8, massa_muscular_kg: 29.0, gordura_pct: 29.2, imc: 25.1 },
  { data: "2025-12-01", peso_kg: 70.2, massa_muscular_kg: 29.4, gordura_pct: 28.4, imc: 24.9 },
  { data: "2026-01-01", peso_kg: 69.5, massa_muscular_kg: 29.9, gordura_pct: 27.5, imc: 24.6 },
  { data: "2026-02-01", peso_kg: 68.9, massa_muscular_kg: 30.3, gordura_pct: 26.6, imc: 24.4 },
  { data: "2026-03-01", peso_kg: 68.2, massa_muscular_kg: 30.8, gordura_pct: 25.7, imc: 24.2 },
  { data: "2026-04-01", peso_kg: 67.6, massa_muscular_kg: 31.2, gordura_pct: 24.9, imc: 23.9 },
  { data: "2026-05-01", peso_kg: 67.0, massa_muscular_kg: 31.6, gordura_pct: 24.0, imc: 23.7 },
  { data: "2026-06-01", peso_kg: 66.4, massa_muscular_kg: 32.0, gordura_pct: 23.1, imc: 23.5 },
];

export async function apiListEvolucao(alunoId: string): Promise<EvolucaoPonto[]> {
  await wait(350);
  void alunoId;
  return EVOLUCAO;
}

/* -------- Antes & Depois (fotos + métricas) -------- */

export interface FotoEvolucao {
  id: string;
  data: string;
  url: string;
  peso_kg: number;
  gordura_pct: number;
  massa_muscular_kg: number;
}

const FOTOS: FotoEvolucao[] = [
  { id: "f1", data: "2025-09-01", url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=800&fit=crop", peso_kg: 72.4, gordura_pct: 31.2, massa_muscular_kg: 28.1 },
  { id: "f2", data: "2025-12-01", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=800&fit=crop", peso_kg: 70.2, gordura_pct: 28.4, massa_muscular_kg: 29.4 },
  { id: "f3", data: "2026-03-01", url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=800&fit=crop", peso_kg: 68.2, gordura_pct: 25.7, massa_muscular_kg: 30.8 },
  { id: "f4", data: "2026-06-01", url: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&h=800&fit=crop", peso_kg: 66.4, gordura_pct: 23.1, massa_muscular_kg: 32.0 },
];

/* -------- Parceiros (vitrine pública) -------- */

export type ParceiroCategoria =
  | "Nutrição"
  | "Fisioterapia"
  | "Medicina Esportiva"
  | "Suplementação"
  | "Estética"
  | "Laboratórios";

export const PARCEIRO_CATEGORIAS: ParceiroCategoria[] = [
  "Nutrição",
  "Fisioterapia",
  "Medicina Esportiva",
  "Suplementação",
  "Estética",
  "Laboratórios",
];

export interface Parceiro {
  id: string;
  nome: string;
  logo_url: string;
  categoria: ParceiroCategoria;
  descricao: string;
  link: string;
  criado_em: string;
}

const PARCEIROS: Parceiro[] = [
  {
    id: "pa1",
    nome: "NutriVida",
    logo_url: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=200&h=200&fit=crop",
    categoria: "Nutrição",
    descricao: "Consultoria nutricional especializada em performance esportiva.",
    link: "https://example.com/nutrivida",
    criado_em: "2026-03-12",
  },
  {
    id: "pa2",
    nome: "FisioMov",
    logo_url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop",
    categoria: "Fisioterapia",
    descricao: "Reabilitação e prevenção de lesões para atletas.",
    link: "https://example.com/fisiomov",
    criado_em: "2026-02-04",
  },
  {
    id: "pa3",
    nome: "Sports Med Center",
    logo_url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&h=200&fit=crop",
    categoria: "Medicina Esportiva",
    descricao: "Acompanhamento médico esportivo completo.",
    link: "https://example.com/sportsmed",
    criado_em: "2026-01-20",
  },
  {
    id: "pa4",
    nome: "PureSupp",
    logo_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&h=200&fit=crop",
    categoria: "Suplementação",
    descricao: "Linha premium de suplementos com certificação.",
    link: "https://example.com/puresupp",
    criado_em: "2025-12-02",
  },
];

export async function apiListParceiros(): Promise<{ data: Parceiro[] }> {
  await wait(250);
  return { data: [...PARCEIROS] };
}

export async function apiCreateParceiro(
  payload: Omit<Parceiro, "id" | "criado_em">,
): Promise<{ data: Parceiro }> {
  await wait(450);
  const novo: Parceiro = {
    ...payload,
    id: `pa${Date.now()}`,
    criado_em: new Date().toISOString().slice(0, 10),
  };
  PARCEIROS.unshift(novo);
  return { data: novo };
}

export async function apiUpdateParceiro(
  id: string,
  patch: Partial<Omit<Parceiro, "id" | "criado_em">>,
): Promise<{ data: Parceiro }> {
  await wait(400);
  const idx = PARCEIROS.findIndex((p) => p.id === id);
  if (idx < 0) throw { status: 404, message: "Parceiro não encontrado" };
  PARCEIROS[idx] = { ...PARCEIROS[idx], ...patch };
  return { data: PARCEIROS[idx] };
}

export async function apiDeleteParceiro(id: string): Promise<{ data: { id: string } }> {
  await wait(350);
  const idx = PARCEIROS.findIndex((p) => p.id === id);
  if (idx >= 0) PARCEIROS.splice(idx, 1);
  return { data: { id } };
}

export async function apiListFotos(alunoId: string): Promise<FotoEvolucao[]> {
  await wait(300);
  void alunoId;
  return FOTOS;
}


/* -------- Avaliação Biomecânica -------- */

export type BiomecanicaSlot =
  | "frontal"
  | "posterior"
  | "flexao_tronco"
  | "lado_esquerdo"
  | "lado_direito"
  | "flexao_perfil";

export type BiomecanicaImagens = Partial<Record<BiomecanicaSlot, string>>;

export interface BiomecanicaAvaliacao {
  id: string;
  criada_em: string;
  imagens: BiomecanicaImagens;
}

const BIOMECANICA_HIST: Record<string, BiomecanicaAvaliacao[]> = {};

function ensureAvaliacaoAtual(alunoId: string): BiomecanicaAvaliacao {
  const list = BIOMECANICA_HIST[alunoId] ?? (BIOMECANICA_HIST[alunoId] = []);
  if (list.length === 0) {
    list.push({
      id: `bio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      criada_em: new Date().toISOString(),
      imagens: {},
    });
  }
  return list[list.length - 1];
}

export async function apiListBiomecanica(alunoId: string): Promise<BiomecanicaImagens> {
  await wait(250);
  const list = BIOMECANICA_HIST[alunoId] ?? [];
  if (list.length === 0) return {};
  return { ...list[list.length - 1].imagens };
}

export async function apiListBiomecanicaHistorico(
  alunoId: string,
): Promise<BiomecanicaAvaliacao[]> {
  await wait(250);
  const list = BIOMECANICA_HIST[alunoId] ?? [];
  if (list.length <= 1) return [];
  // Histórico = todas as avaliações exceto a atual (última), ordem decrescente
  return list.slice(0, -1).map((a) => ({ ...a, imagens: { ...a.imagens } })).reverse();
}

export async function apiNovaAvaliacaoBiomecanica(
  alunoId: string,
): Promise<BiomecanicaAvaliacao> {
  await wait(300);
  const list = BIOMECANICA_HIST[alunoId] ?? (BIOMECANICA_HIST[alunoId] = []);
  const atual = list[list.length - 1];
  // Só arquiva se a avaliação atual tem alguma imagem; senão reaproveita
  if (!atual || Object.keys(atual.imagens).length > 0) {
    const nova: BiomecanicaAvaliacao = {
      id: `bio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      criada_em: new Date().toISOString(),
      imagens: {},
    };
    list.push(nova);
    return nova;
  }
  return atual;
}

export async function apiUploadBiomecanica(
  alunoId: string,
  slot: BiomecanicaSlot,
  file: File,
): Promise<{ slot: BiomecanicaSlot; url: string }> {
  await wait(500);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
  const atual = ensureAvaliacaoAtual(alunoId);
  atual.imagens[slot] = url;
  return { slot, url };
}

export async function apiDeleteBiomecanica(
  alunoId: string,
  slot: BiomecanicaSlot,
): Promise<{ slot: BiomecanicaSlot }> {
  await wait(300);
  const list = BIOMECANICA_HIST[alunoId];
  if (list && list.length > 0) {
    delete list[list.length - 1].imagens[slot];
  }
  return { slot };
}

/* -------- Avaliação Estrutural -------- */

export type EstruturalItem =
  | "escoliose"
  | "rotacao_coluna"
  | "rotacao_quadril"
  | "desequilibrio_cintura_escapular"
  | "discinesia_escapular"
  | "encurtamento"
  | "diferenca_tamanho_membros"
  | "anteversao_pelvica"
  | "retroversao_pelvica"
  | "joelho_valgo"
  | "joelho_varo"
  | "arco_plantar_cavo"
  | "arco_plantar_plano";

export const ESTRUTURAL_ITENS: { key: EstruturalItem; label: string }[] = [
  { key: "escoliose", label: "Escoliose" },
  { key: "rotacao_coluna", label: "Rotação na coluna" },
  { key: "rotacao_quadril", label: "Rotação no quadril" },
  { key: "desequilibrio_cintura_escapular", label: "Desequilíbrio força cintura escapular" },
  { key: "discinesia_escapular", label: "Discinesia escapular" },
  { key: "encurtamento", label: "Encurtamento" },
  { key: "diferenca_tamanho_membros", label: "Diferença no tamanho de membros" },
  { key: "anteversao_pelvica", label: "Anteversão Pélvica" },
  { key: "retroversao_pelvica", label: "Retroversão Pélvica" },
  { key: "joelho_valgo", label: "Joelho Valgo" },
  { key: "joelho_varo", label: "Joelho Varo" },
  { key: "arco_plantar_cavo", label: "Arco Plantar Cavo" },
  { key: "arco_plantar_plano", label: "Arco Plantar Plano" },
];


export type AvaliacaoEstrutural = Partial<Record<EstruturalItem, boolean>>;

const ESTRUTURAL: Record<string, AvaliacaoEstrutural> = {};

export async function apiGetEstrutural(alunoId: string): Promise<AvaliacaoEstrutural> {
  await wait(200);
  return { ...(ESTRUTURAL[alunoId] ?? {}) };
}

export async function apiSetEstrutural(
  alunoId: string,
  item: EstruturalItem,
  value: boolean,
): Promise<AvaliacaoEstrutural> {
  await wait(200);
  ESTRUTURAL[alunoId] = { ...(ESTRUTURAL[alunoId] ?? {}), [item]: value };
  return { ...ESTRUTURAL[alunoId] };
}

/* -------- Anamnese Dinâmica -------- */

export type AnamneseItem =
  | "remedios"
  | "reposicoes"
  | "observacoes"
  | "pressao_sistolica"
  | "pressao_diastolica"
  | "glicemia_variavel"
  | "fratura"
  | "luxacoes"
  | "dor"
  | "altura"
  | "peso"
  | "refeicoes"
  | "hidratacao"
  | "sono"
  | "fezes"
  | "urina"
  | "observacoes_ortopedica"
  | "objetivos";

export type AnamneseDinamica = Partial<Record<AnamneseItem, string>>;

export const ANAMNESE_SECOES: {
  titulo: string;
  itens: { key: AnamneseItem; label: string }[];
}[] = [
  {
    titulo: "OBJETIVOS",
    itens: [
      { key: "objetivos", label: "Objetivo a ser atingido" },
    ],
  },
  {
    titulo: "Quadro Clínico",
    itens: [
      { key: "remedios", label: "Remédios" },
      { key: "reposicoes", label: "Reposições / Suplementos" },
      { key: "pressao_sistolica", label: "Pressão Sistólica" },
      { key: "pressao_diastolica", label: "Pressão Diastólica" },
      { key: "glicemia_variavel", label: "Glicemia Variável" },
      { key: "observacoes", label: "Observações" },
    ],
  },
  {
    titulo: "Avaliação Ortopédica",
    itens: [
      { key: "altura", label: "Altura" },
      { key: "peso", label: "Peso" },
      { key: "fratura", label: "Fratura" },
      { key: "luxacoes", label: "Luxações" },
      { key: "dor", label: "Dor" },
      { key: "observacoes_ortopedica", label: "Observações" },
    ],
  },
  {
    titulo: "Avaliação de Hábitos",
    itens: [
      { key: "refeicoes", label: "Refeições" },
      { key: "hidratacao", label: "Hidratação" },
      { key: "sono", label: "Sono" },
      { key: "fezes", label: "Fezes" },
      { key: "urina", label: "Urina" },
    ],
  },
];


const ANAMNESE: Record<string, AnamneseDinamica> = {};

export async function apiGetAnamnese(alunoId: string): Promise<AnamneseDinamica> {
  await wait(200);
  return { ...(ANAMNESE[alunoId] ?? {}) };
}

export async function apiSetAnamnese(
  alunoId: string,
  item: AnamneseItem,
  value: string,
): Promise<AnamneseDinamica> {
  await wait(200);
  ANAMNESE[alunoId] = { ...(ANAMNESE[alunoId] ?? {}), [item]: value };
  return { ...ANAMNESE[alunoId] };
}

/* -------- Exames do Aluno -------- */

export interface ExameAluno {
  id: string;
  nome: string;
  descricao?: string;
  arquivo_url: string;
  content_type: string;
  tamanho: number;
  enviado_em: string;
}

const EXAMES: Record<string, ExameAluno[]> = {};

export async function apiListExames(alunoId: string): Promise<ExameAluno[]> {
  await wait(200);
  return [...(EXAMES[alunoId] ?? [])].sort(
    (a, b) => new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime(),
  );
}

export async function apiUploadExame(
  alunoId: string,
  file: File,
  meta?: { nome?: string; descricao?: string },
): Promise<ExameAluno> {
  await wait(400);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
  const exame: ExameAluno = {
    id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    nome: meta?.nome?.trim() || file.name,
    descricao: meta?.descricao?.trim() || undefined,
    arquivo_url: url,
    content_type: file.type || "application/octet-stream",
    tamanho: file.size,
    enviado_em: new Date().toISOString(),
  };
  EXAMES[alunoId] = [...(EXAMES[alunoId] ?? []), exame];
  return exame;
}

export async function apiDeleteExame(
  alunoId: string,
  exameId: string,
): Promise<{ id: string }> {
  await wait(200);
  EXAMES[alunoId] = (EXAMES[alunoId] ?? []).filter((e) => e.id !== exameId);
  return { id: exameId };
}
