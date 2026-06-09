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
  },
  {
    id: "u_aluno_01",
    name: "Júlia Ferreira",
    email: "aluno@forlife.app",
    password: "Aluno@2026",
    role: "aluno",
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

export async function apiListAlunos() {
  await wait(300);
  return { data: [...ALUNOS], meta: { total: ALUNOS.length } };
}

export async function apiListPersonais() {
  await wait(300);
  return { data: [...PERSONAIS], meta: { total: PERSONAIS.length } };
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
  return { data: novo };
}

export async function apiCreatePersonal(payload: Omit<Personal, "id" | "alunos_count">) {
  await wait(500);
  const novo: Personal = { ...payload, id: `p${Date.now()}`, alunos_count: 0 };
  PERSONAIS.unshift(novo);
  return { data: novo };
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
