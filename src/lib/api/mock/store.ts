import type { ApiError } from "../http";
import type { Trainer, CreateTrainerPayload, UpdateTrainerPayload } from "../trainers";
import type { Student, CreateStudentPayload, UpdateStudentPayload } from "../students";
import type { Partner, CreatePartnerPayload, UpdatePartnerPayload } from "../partners";
import type {
  Workout,
  Exercise,
  CreateWorkoutPayload,
  UpdateWorkoutPayload,
  CreateExercisePayload,
  UpdateExercisePayload,
} from "../workouts";
import type { DashboardKpi, RangeFilter } from "../dashboard";
import type { BioimpedanceMeasurement, CreateMeasurementPayload } from "../bioimpedance";
import type {
  BiomechanicalAssessment,
  BiomechanicsSlotBackend,
  BiomechanicsImages,
} from "../biomechanics";
import type { StructuralAssessment, UpdateStructuralPayload } from "../structural-assessment";
import type { Anamnesis, UpdateAnamnesisPayload } from "../anamnesis";
import type { Exam, CreateExamPayload } from "../exams";
import type { EvolutionPhoto, CreateEvolutionPhotoPayload } from "../evolution-photos";
import type { BackendUser, LoginResponse } from "../auth";
import type { BioImportResult } from "../bioimpedance-import";
import {
  TRAINERS,
  STUDENTS,
  PARTNERS,
  WORKOUTS_BY_STUDENT,
  BIOIMPEDANCE_BY_STUDENT,
  BIOMECHANICS_BY_STUDENT,
  STRUCTURAL_BY_STUDENT,
  ANAMNESIS_BY_STUDENT,
  EXAMS_BY_STUDENT,
  EVOLUTION_PHOTOS_BY_STUDENT,
  MOCK_USERS,
} from "./fixtures";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function notFound(message = "Registro não encontrado"): never {
  const err: ApiError = { status: 404, message };
  throw err;
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------- Trainers -------------------- */

let trainers: Trainer[] = clone(TRAINERS);

function studentsCountFor(trainerId: string): number {
  return students.filter((s) => s.trainer_id === trainerId && s.status === "active").length;
}

function withComputedCount(t: Trainer): Trainer {
  return { ...t, students_count: studentsCountFor(t.id) };
}

export function listTrainers(query?: string): Trainer[] {
  const all = trainers.map(withComputedCount);
  if (!query?.trim()) return all;
  const q = query.trim().toLowerCase();
  return all.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.cref.toLowerCase().includes(q),
  );
}

export function getTrainer(id: string): Trainer {
  const found = trainers.find((t) => t.id === id);
  if (!found) notFound("Personal não encontrado");
  return withComputedCount(found);
}

export function createTrainer(payload: CreateTrainerPayload): Trainer {
  const trainer: Trainer = {
    id: nextId("trainer"),
    name: payload.name,
    cpf: payload.cpf ?? "",
    cref: payload.cref ?? "",
    email: payload.email,
    phone: payload.phone,
    status: payload.status ?? "active",
    students_count: 0,
  };
  trainers = [...trainers, trainer];
  return trainer;
}

export function updateTrainer(id: string, payload: UpdateTrainerPayload): Trainer {
  const idx = trainers.findIndex((t) => t.id === id);
  if (idx === -1) notFound("Personal não encontrado");
  trainers[idx] = { ...trainers[idx], ...payload };
  return withComputedCount(trainers[idx]);
}

export function deleteTrainer(id: string): void {
  trainers = trainers.filter((t) => t.id !== id);
}

/* -------------------- Students -------------------- */

let students: Student[] = clone(STUDENTS);

export function listStudents(params?: {
  trainerId?: string;
  query?: string;
  status?: Student["status"];
}): Student[] {
  let list = students;
  if (params?.trainerId) list = list.filter((s) => s.trainer_id === params.trainerId);
  if (params?.status) list = list.filter((s) => s.status === params.status);
  if (params?.query?.trim()) {
    const q = params.query.trim().toLowerCase();
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }
  return list;
}

export function getStudent(id: string): Student {
  const found = students.find((s) => s.id === id);
  if (!found) notFound("Aluno não encontrado");
  return found;
}

export function createStudent(payload: CreateStudentPayload): Student {
  const trainer = payload.trainer_id
    ? trainers.find((t) => t.id === payload.trainer_id)
    : undefined;
  const student: Student = {
    id: nextId("student"),
    name: payload.name,
    birth_date: payload.birth_date,
    sex: payload.sex,
    email: payload.email,
    phone: payload.phone,
    trainer_id: payload.trainer_id ?? "",
    trainer_name: trainer?.name ?? "",
    status: "active",
    health_plan: null,
    emergency_contact: null,
    created_at: new Date().toISOString(),
  };
  students = [...students, student];
  return student;
}

export function updateStudent(id: string, payload: UpdateStudentPayload): Student {
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) notFound("Aluno não encontrado");
  const trainer = payload.trainer_id
    ? trainers.find((t) => t.id === payload.trainer_id)
    : undefined;
  students[idx] = {
    ...students[idx],
    ...payload,
    trainer_name: trainer?.name ?? students[idx].trainer_name,
  };
  return students[idx];
}

export function deleteStudent(id: string): void {
  students = students.filter((s) => s.id !== id);
}

/* -------------------- Partners -------------------- */

let partners: Partner[] = clone(PARTNERS);

export function listPartners(): Partner[] {
  return partners;
}

export function createPartner(payload: CreatePartnerPayload): Partner {
  const partner: Partner = {
    id: nextId("partner"),
    name: payload.name,
    logo_url: payload.logo_url ?? null,
    category: payload.category,
    description: payload.description ?? null,
    coupon: payload.coupon ?? null,
    link: payload.link ?? null,
    created_at: new Date().toISOString(),
  };
  partners = [...partners, partner];
  return partner;
}

export function updatePartner(id: string, payload: UpdatePartnerPayload): Partner {
  const idx = partners.findIndex((p) => p.id === id);
  if (idx === -1) notFound("Parceiro não encontrado");
  partners[idx] = { ...partners[idx], ...payload };
  return partners[idx];
}

export function deletePartner(id: string): void {
  partners = partners.filter((p) => p.id !== id);
}

/* -------------------- Workouts & Exercises -------------------- */

const workoutsByStudent: Record<string, Workout[]> = clone(WORKOUTS_BY_STUDENT);

function workoutsFor(studentId: string): Workout[] {
  return (workoutsByStudent[studentId] ??= []);
}

export function listWorkouts(studentId: string): Workout[] {
  return workoutsFor(studentId);
}

function getWorkout(studentId: string, workoutId: string): Workout {
  const found = workoutsFor(studentId).find((w) => w.id === workoutId);
  if (!found) notFound("Treino não encontrado");
  return found;
}

export function createWorkout(studentId: string, payload: CreateWorkoutPayload): Workout {
  const list = workoutsFor(studentId);
  const student = students.find((s) => s.id === studentId);
  const workout: Workout = {
    id: nextId("workout"),
    position: list.filter((w) => w.status === "active").length,
    title: payload.title,
    focus: payload.focus,
    status: "active",
    created_at: new Date().toISOString(),
    archived_at: null,
    trainer_name: payload.trainer_name ?? student?.trainer_name ?? "",
    exercises: [],
  };
  workoutsByStudent[studentId] = [...list, workout];
  return workout;
}

export function updateWorkout(
  studentId: string,
  workoutId: string,
  payload: UpdateWorkoutPayload,
): Workout {
  const list = workoutsFor(studentId);
  const idx = list.findIndex((w) => w.id === workoutId);
  if (idx === -1) notFound("Treino não encontrado");
  list[idx] = { ...list[idx], ...payload };
  return list[idx];
}

export function archiveWorkout(studentId: string, workoutId: string): Workout {
  const workout = getWorkout(studentId, workoutId);
  workout.status = "archived";
  workout.archived_at = new Date().toISOString();
  return workout;
}

export function unarchiveWorkout(studentId: string, workoutId: string): Workout {
  const workout = getWorkout(studentId, workoutId);
  workout.status = "active";
  workout.archived_at = null;
  return workout;
}

export function reorderWorkouts(studentId: string, orderedIds: string[]): Workout[] {
  const list = workoutsFor(studentId);
  orderedIds.forEach((id, position) => {
    const workout = list.find((w) => w.id === id);
    if (workout) workout.position = position;
  });
  return list;
}

export function createExercise(
  studentId: string,
  workoutId: string,
  payload: CreateExercisePayload,
): Exercise {
  const workout = getWorkout(studentId, workoutId);
  const exercise: Exercise = {
    id: nextId("exercise"),
    position: workout.exercises.length,
    kind: payload.kind ?? "strength",
    name: payload.name,
    sets: payload.sets ?? null,
    reps: payload.reps ?? null,
    load_kg: payload.load_kg ?? null,
    rest_seconds: payload.rest_seconds ?? null,
    muscle_group: payload.muscle_group ?? null,
    duration_seconds: payload.duration_seconds ?? null,
    distance_value: payload.distance_value ?? null,
    distance_unit: payload.distance_unit ?? null,
    hr_zone: payload.hr_zone ?? null,
    heart_rate_bpm: payload.heart_rate_bpm ?? null,
    video_url: payload.video_url ?? "",
    notes: payload.notes ?? null,
  };
  workout.exercises = [...workout.exercises, exercise];
  return exercise;
}

export function updateExercise(
  studentId: string,
  workoutId: string,
  exerciseId: string,
  payload: UpdateExercisePayload,
): Exercise {
  const workout = getWorkout(studentId, workoutId);
  const idx = workout.exercises.findIndex((e) => e.id === exerciseId);
  if (idx === -1) notFound("Exercício não encontrado");
  workout.exercises[idx] = { ...workout.exercises[idx], ...payload };
  return workout.exercises[idx];
}

export function reorderExercises(
  studentId: string,
  workoutId: string,
  orderedIds: string[],
): Exercise[] {
  const workout = getWorkout(studentId, workoutId);
  orderedIds.forEach((id, position) => {
    const exercise = workout.exercises.find((e) => e.id === id);
    if (exercise) exercise.position = position;
  });
  return workout.exercises;
}

export function deleteExercise(studentId: string, workoutId: string, exerciseId: string): void {
  const workout = getWorkout(studentId, workoutId);
  workout.exercises = workout.exercises.filter((e) => e.id !== exerciseId);
}

/* -------------------- Dashboard -------------------- */

const RANGE_MULTIPLIER: Record<RangeFilter, number> = { day: 0.2, week: 0.6, month: 1, year: 1.3 };

export function getDashboardKpis(range: RangeFilter): DashboardKpi[] {
  const multiplier = RANGE_MULTIPLIER[range];
  return [
    {
      label: "Alunos",
      value: Math.round(students.length * multiplier * 10),
      delta: 6.2,
      icon: "users",
    },
    {
      label: "Personais",
      value: Math.round(trainers.length * multiplier * 3),
      delta: 4.1,
      icon: "trainer",
    },
    {
      label: "Parceiros",
      value: Math.round(partners.length * multiplier * 2),
      delta: 1.2,
      icon: "handshake",
    },
    { label: "Avaliações", value: Math.round(132 * multiplier), delta: 8.6, icon: "clipboard" },
    { label: "Treinos Ativos", value: Math.round(241 * multiplier), delta: 5.3, icon: "dumbbell" },
  ];
}

export function getDashboardActivity(days: number): Array<{
  label: string;
  workouts: number;
  assessments: number;
}> {
  const points = days >= 365 ? 12 : days >= 30 ? 10 : days >= 7 ? 7 : 6;
  const monthLabels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return Array.from({ length: points }, (_, i) => ({
    label: days >= 365 ? monthLabels[i % 12] : `${i + 1}`,
    workouts: 20 + ((i * 7) % 30),
    assessments: 4 + ((i * 3) % 12),
  }));
}

/* -------------------- Bioimpedance -------------------- */

const bioimpedanceByStudent: Record<string, BioimpedanceMeasurement[]> =
  clone(BIOIMPEDANCE_BY_STUDENT);

export function listBioimpedance(studentId: string): BioimpedanceMeasurement[] {
  return (bioimpedanceByStudent[studentId] ??= []);
}

export function createBioimpedance(
  studentId: string,
  payload: CreateMeasurementPayload,
): BioimpedanceMeasurement {
  const list = listBioimpedance(studentId);
  const measurement: BioimpedanceMeasurement = {
    id: nextId("bio"),
    student_id: studentId,
    measured_on: payload.measured_on,
    weight_kg: payload.weight_kg,
    muscle_mass_kg: payload.muscle_mass_kg,
    fat_percentage: payload.fat_percentage,
    visceral_fat: payload.visceral_fat ?? null,
    bmi: payload.bmi,
    source: "manual",
    photo_id: null,
    photo_url: null,
  };
  bioimpedanceByStudent[studentId] = [...list, measurement];
  return measurement;
}

export function deleteBioimpedance(studentId: string, measurementId: string): void {
  bioimpedanceByStudent[studentId] = listBioimpedance(studentId).filter(
    (m) => m.id !== measurementId,
  );
}

/** Lightweight, best-effort CSV parser mirroring the real import endpoint's contract. */
export async function importBioimpedanceCsv(
  studentId: string,
  file: File,
): Promise<BioImportResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1);
  const errors: string[] = [];
  const preview: BioimpedanceMeasurement[] = [];

  rows.forEach((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 5) {
      errors.push(`Linha ${i + 2}: formato inválido (colunas insuficientes)`);
      return;
    }
    const [measured_on, weightStr, muscleStr, fatStr, bmiStr] = cols;
    const weight_kg = Number(weightStr);
    const muscle_mass_kg = Number(muscleStr);
    const fat_percentage = Number(fatStr);
    const bmi = Number(bmiStr);
    if ([weight_kg, muscle_mass_kg, fat_percentage, bmi].some((n) => Number.isNaN(n))) {
      errors.push(`Linha ${i + 2}: valores numéricos inválidos`);
      return;
    }
    preview.push({
      id: nextId("bio"),
      student_id: studentId,
      measured_on,
      weight_kg,
      muscle_mass_kg,
      fat_percentage,
      visceral_fat: null,
      bmi,
      source: "import",
      photo_id: null,
      photo_url: null,
    });
  });

  bioimpedanceByStudent[studentId] = [...listBioimpedance(studentId), ...preview];
  return { imported: preview.length, errors, preview };
}

/* -------------------- Biomechanics -------------------- */

const biomechanicsByStudent: Record<string, BiomechanicalAssessment[]> =
  clone(BIOMECHANICS_BY_STUDENT);

function biomechanicsFor(studentId: string): BiomechanicalAssessment[] {
  return (biomechanicsByStudent[studentId] ??= []);
}

export function listBiomechanics(studentId: string): BiomechanicalAssessment[] {
  return biomechanicsFor(studentId);
}

export function getCurrentBiomechanics(studentId: string): BiomechanicalAssessment {
  const list = biomechanicsFor(studentId);
  if (list.length === 0) {
    const assessment: BiomechanicalAssessment = {
      id: nextId("biomech"),
      created_at: new Date().toISOString(),
      images: {},
    };
    biomechanicsByStudent[studentId] = [assessment];
    return assessment;
  }
  return list[list.length - 1];
}

export function newBiomechanicsAssessment(studentId: string): BiomechanicalAssessment {
  const assessment: BiomechanicalAssessment = {
    id: nextId("biomech"),
    created_at: new Date().toISOString(),
    images: {},
  };
  biomechanicsByStudent[studentId] = [...biomechanicsFor(studentId), assessment];
  return assessment;
}

export function uploadBiomechanicsSlot(
  studentId: string,
  slot: BiomechanicsSlotBackend,
  imageDataUrl: string,
): BiomechanicalAssessment {
  const current = getCurrentBiomechanics(studentId);
  const images: BiomechanicsImages = { ...current.images, [slot]: imageDataUrl };
  current.images = images;
  return current;
}

export function removeBiomechanicsSlot(
  studentId: string,
  slot: BiomechanicsSlotBackend,
): BiomechanicalAssessment {
  const current = getCurrentBiomechanics(studentId);
  const images: BiomechanicsImages = { ...current.images };
  delete images[slot];
  current.images = images;
  return current;
}

/* -------------------- Structural assessment -------------------- */

const structuralByStudent: Record<string, StructuralAssessment> = clone(STRUCTURAL_BY_STUDENT);

const EMPTY_STRUCTURAL: StructuralAssessment = {
  scoliosis: false,
  spine_rotation: false,
  hip_rotation: false,
  scapular_girdle_imbalance: false,
  scapular_dyskinesis: false,
  shortening: false,
  limb_length_difference: false,
  pelvic_anteversion: false,
  pelvic_retroversion: false,
  knee_valgus: false,
  knee_varus: false,
  cavus_foot_arch: false,
  flat_foot_arch: false,
};

export function getStructuralAssessment(studentId: string): StructuralAssessment {
  return (structuralByStudent[studentId] ??= { ...EMPTY_STRUCTURAL });
}

export function updateStructuralAssessment(
  studentId: string,
  payload: UpdateStructuralPayload,
): StructuralAssessment {
  const current = getStructuralAssessment(studentId);
  structuralByStudent[studentId] = { ...current, ...payload };
  return structuralByStudent[studentId];
}

/* -------------------- Anamnesis -------------------- */

const anamnesisByStudent: Record<string, Anamnesis> = clone(ANAMNESIS_BY_STUDENT);

export function getAnamnesis(studentId: string): Anamnesis {
  return (anamnesisByStudent[studentId] ??= {});
}

export function updateAnamnesis(studentId: string, payload: UpdateAnamnesisPayload): Anamnesis {
  const current = getAnamnesis(studentId);
  anamnesisByStudent[studentId] = { ...current, ...payload };
  return anamnesisByStudent[studentId];
}

/* -------------------- Exams -------------------- */

const examsByStudent: Record<string, Exam[]> = clone(EXAMS_BY_STUDENT);

export function listExams(studentId: string): Exam[] {
  return (examsByStudent[studentId] ??= []);
}

export function createExam(studentId: string, payload: CreateExamPayload): Exam {
  const exam: Exam = {
    id: nextId("exam"),
    name: payload.name,
    description: payload.description ?? null,
    file_url: payload.file_url,
    content_type: payload.content_type,
    size: payload.size,
    uploaded_at: payload.uploaded_at,
  };
  examsByStudent[studentId] = [...listExams(studentId), exam];
  return exam;
}

export function deleteExam(studentId: string, examId: string): void {
  examsByStudent[studentId] = listExams(studentId).filter((e) => e.id !== examId);
}

/* -------------------- Evolution photos -------------------- */

const evolutionPhotosByStudent: Record<string, EvolutionPhoto[]> = clone(
  EVOLUTION_PHOTOS_BY_STUDENT,
);

export function listEvolutionPhotos(studentId: string): EvolutionPhoto[] {
  return (evolutionPhotosByStudent[studentId] ??= []);
}

export function createEvolutionPhoto(
  studentId: string,
  payload: CreateEvolutionPhotoPayload,
): EvolutionPhoto {
  const photo: EvolutionPhoto = {
    id: nextId("photo"),
    measurement_id: payload.bioimpedance_measurement_id,
    taken_on: new Date().toISOString(),
    image_url: payload.image_url,
  };
  evolutionPhotosByStudent[studentId] = [...listEvolutionPhotos(studentId), photo];
  return photo;
}

export function deleteEvolutionPhoto(studentId: string, photoId: string): void {
  evolutionPhotosByStudent[studentId] = listEvolutionPhotos(studentId).filter(
    (p) => p.id !== photoId,
  );
}

/* -------------------- Auth -------------------- */

let mockUsers: Array<BackendUser & { password: string }> = clone(MOCK_USERS);

function issueToken(userId: string): string {
  return `mock.${userId}.${Date.now().toString(36)}`;
}

function userIdFromToken(token: string): string | null {
  const match = /^mock\.([^.]+)\./.exec(token);
  return match ? match[1] : null;
}

function sessionFor(user: BackendUser & { password: string }): LoginResponse {
  const { password: _password, ...rest } = user;
  return {
    token: issueToken(user.id),
    user: rest,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

export function login(email: string, password: string): LoginResponse {
  const found = mockUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!found) {
    const err: ApiError = { status: 401, message: "Credenciais inválidas" };
    throw err;
  }
  return sessionFor(found);
}

/** Offline Google login always succeeds as the demo aluno account. */
export function googleLogin(): LoginResponse {
  const found = mockUsers.find((u) => u.role === "student");
  if (!found) notFound("Usuário demo não encontrado");
  return sessionFor(found);
}

export function register(params: {
  name: string;
  email: string;
  password: string;
  role?: BackendUser["role"];
}): LoginResponse {
  if (mockUsers.some((u) => u.email.toLowerCase() === params.email.toLowerCase())) {
    const err: ApiError = { status: 422, message: "E-mail já cadastrado" };
    throw err;
  }
  const student = createStudent({
    name: params.name,
    birth_date: "2000-01-01",
    sex: "other",
    email: params.email,
    phone: "",
  });
  const user: BackendUser & { password: string } = {
    id: nextId("user"),
    name: params.name,
    email: params.email,
    password: params.password,
    role: params.role ?? "student",
    student_id: student.id,
  };
  mockUsers = [...mockUsers, user];
  return sessionFor(user);
}

export function currentUser(token: string | null): BackendUser {
  const id = token ? userIdFromToken(token) : null;
  const found = id ? mockUsers.find((u) => u.id === id) : undefined;
  if (!found) {
    const err: ApiError = { status: 401, message: "Sessão expirada" };
    throw err;
  }
  const { password: _password, ...rest } = found;
  return rest;
}
