import type { ApiError } from "../http";
import type { RangeFilter } from "../dashboard";
import type { BiomechanicsSlotBackend } from "../biomechanics";
import type { CreateTrainerPayload, UpdateTrainerPayload } from "../trainers";
import type { CreateStudentPayload, UpdateStudentPayload, StudentStatus } from "../students";
import type { CreatePartnerPayload, UpdatePartnerPayload } from "../partners";
import type {
  CreateWorkoutPayload,
  UpdateWorkoutPayload,
  CreateExercisePayload,
  UpdateExercisePayload,
} from "../workouts";
import type { CreateMeasurementPayload } from "../bioimpedance";
import type { UpdateStructuralPayload } from "../structural-assessment";
import type { UpdateAnamnesisPayload } from "../anamnesis";
import type { CreateExamPayload } from "../exams";
import type { CreateEvolutionPhotoPayload } from "../evolution-photos";
import type { CreateFeedbackPayload } from "../feedbacks";
import * as store from "./store";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

function badRequest(message: string): never {
  const err: ApiError = { status: 400, message };
  throw err;
}

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    return body as Record<string, unknown>;
  }
  return {};
}

const RANGE_DAYS: Record<RangeFilter, number> = { day: 1, week: 7, month: 30, year: 365 };

function activityDaysFromParam(
  params: Record<string, string | number | boolean | undefined | null> | undefined,
): number {
  const raw = params?.days;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim()) return Number(raw);
  return RANGE_DAYS.month;
}

export interface MockRequestInput {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  token: string | null;
}

/**
 * Resolves a request entirely in-memory, mirroring the real API's URL shape.
 * Routes are checked from most to least specific so literal segments (e.g.
 * `/reorder`) are never swallowed by a generic `:id` pattern.
 */
export async function resolveMockRequest<T>(input: MockRequestInput): Promise<T> {
  await wait();
  // A real request body always travels through JSON.stringify → the wire →
  // JSON.parse, which silently drops any key whose value is `undefined`.
  // Round-tripping here too means a payload that "forgets" to explicitly
  // null out a field behaves the same against the mock as it would against
  // the real Rails backend (a bug caught this way — an omitted key updating
  // nothing, instead of clearing the column — see workouts.ts's hr_zone fix).
  const body =
    input.body && !(input.body instanceof FormData)
      ? (JSON.parse(JSON.stringify(input.body)) as unknown)
      : input.body;
  const result = await routeMockRequest<T>({ ...input, body });
  // A real HTTP response is always a fresh value deserialized from JSON,
  // never aliased to server-side state. store.ts mutates its records in
  // place (e.g. createExercise reassigns workout.exercises), so without this
  // clone, a snapshot already handed out (and possibly sitting in the React
  // Query cache) would silently change when the store mutates later —
  // producing duplicate/torn reads when a query's cached data and a
  // mutation's optimistic update race (see aluno-treino.spec.ts flakiness).
  return structuredClone(result);
}

async function routeMockRequest<T>({
  method,
  path,
  body,
  params,
  token,
}: MockRequestInput): Promise<T> {
  const m = method.toUpperCase();
  const b = asRecord(body);

  // -------- Auth --------
  if (m === "POST" && path === "/api/v1/auth/login") {
    return store.login(String(b.email ?? ""), String(b.password ?? "")) as T;
  }
  if (m === "POST" && path === "/api/v1/auth/google") {
    return store.googleLogin() as T;
  }
  if (m === "POST" && path === "/api/v1/auth/register") {
    return store.register({
      name: String(b.name ?? ""),
      email: String(b.email ?? ""),
      password: String(b.password ?? ""),
      role: (b.role as "admin" | "personal" | "student" | undefined) ?? "student",
    }) as T;
  }
  if (m === "GET" && path === "/api/v1/auth/me") {
    return store.currentUser(token) as T;
  }
  if (m === "PATCH" && path === "/api/v1/auth/me") {
    return store.updateCurrentUser(token, {
      name: b.name as string | undefined,
      email: b.email as string | undefined,
    }) as T;
  }
  if (m === "PATCH" && path === "/api/v1/auth/password") {
    return store.changePassword(token, {
      current_password: String(b.current_password ?? ""),
      password: String(b.password ?? ""),
      password_confirmation: String(b.password_confirmation ?? ""),
    }) as T;
  }

  // -------- Trainers --------
  if (m === "GET" && path === "/api/v1/trainers/search") {
    return store.listTrainers(
      String(params?.query ?? ""),
      params?.status !== undefined && params?.status !== null ? String(params.status) : undefined,
    ) as T;
  }
  if (m === "GET" && path === "/api/v1/trainers") {
    return store.listTrainers(
      undefined,
      params?.status !== undefined && params?.status !== null ? String(params.status) : undefined,
    ) as T;
  }
  if (m === "POST" && path === "/api/v1/trainers") {
    return store.createTrainer(b as unknown as CreateTrainerPayload) as T;
  }
  let match = /^\/api\/v1\/trainers\/([^/]+)$/.exec(path);
  if (match) {
    const [, id] = match;
    if (m === "GET") return store.getTrainer(id) as T;
    if (m === "PATCH") return store.updateTrainer(id, b as unknown as UpdateTrainerPayload) as T;
    if (m === "DELETE") {
      store.deleteTrainer(id);
      return undefined as T;
    }
  }

  // -------- Students --------
  if (m === "GET" && path === "/api/v1/students") {
    return store.listStudents({
      trainerId: params?.trainer_id ? String(params.trainer_id) : undefined,
      query: params?.query ? String(params.query) : undefined,
      status: params?.status as StudentStatus | undefined,
    }) as T;
  }
  if (m === "POST" && path === "/api/v1/students") {
    return store.createStudent(b as unknown as CreateStudentPayload) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)$/.exec(path);
  if (match) {
    const [, id] = match;
    if (m === "GET") return store.getStudent(id) as T;
    if (m === "PATCH") return store.updateStudent(id, b as unknown as UpdateStudentPayload) as T;
    if (m === "DELETE") {
      store.deleteStudent(id);
      return undefined as T;
    }
  }

  // -------- Partners --------
  if (m === "GET" && path === "/api/v1/partners") {
    return store.listPartners() as T;
  }
  if (m === "POST" && path === "/api/v1/partners") {
    return store.createPartner(b as unknown as CreatePartnerPayload) as T;
  }
  match = /^\/api\/v1\/partners\/([^/]+)$/.exec(path);
  if (match) {
    const [, id] = match;
    if (m === "PATCH") return store.updatePartner(id, b as unknown as UpdatePartnerPayload) as T;
    if (m === "DELETE") {
      store.deletePartner(id);
      return null as T;
    }
  }

  // -------- Push subscriptions --------
  if (m === "POST" && path === "/api/v1/push_subscriptions") {
    return store.subscribePush(
      token,
      b as unknown as { endpoint: string; keys: { p256dh: string; auth: string } },
    ) as T;
  }
  if (m === "DELETE" && path === "/api/v1/push_subscriptions") {
    store.unsubscribePush(String(b.endpoint ?? ""));
    return null as T;
  }

  // -------- Dashboard --------
  if (m === "GET" && path === "/api/v1/dashboard/kpis") {
    return store.getDashboardKpis((params?.range as RangeFilter | undefined) ?? "month") as T;
  }
  if (m === "GET" && path === "/api/v1/dashboard/activity") {
    return store.getDashboardActivity(activityDaysFromParam(params)) as T;
  }
  if (m === "GET" && path === "/api/v1/dashboard/attendance") {
    return store.getAttendanceSummary((params?.range as RangeFilter | undefined) ?? "month") as T;
  }
  if (m === "GET" && path === "/api/v1/completed_check_ins") {
    return store.listCompletedCheckIns() as T;
  }

  // -------- Bioimpedance import (multipart) --------
  if (m === "POST" && path === "/api/v1/bioimpedance/import" && body instanceof FormData) {
    const file = body.get("file");
    const studentId = String(body.get("student_id") ?? "");
    if (!(file instanceof File)) badRequest("Arquivo CSV ausente");
    return (await store.importBioimpedanceCsv(studentId, file)) as T;
  }

  // -------- Workouts & exercises (student-scoped) --------
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/reorder$/.exec(path);
  if (match && m === "PATCH") {
    return store.reorderWorkouts(match[1], (b.ordered_ids as string[]) ?? []) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/exercises\/reorder$/.exec(path);
  if (match && m === "PATCH") {
    return store.reorderExercises(match[1], match[2], (b.ordered_ids as string[]) ?? []) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/exercises\/([^/]+)$/.exec(path);
  if (match) {
    const [, studentId, workoutId, exerciseId] = match;
    if (m === "PATCH")
      return store.updateExercise(
        studentId,
        workoutId,
        exerciseId,
        b as unknown as UpdateExercisePayload,
      ) as T;
    if (m === "DELETE") {
      store.deleteExercise(studentId, workoutId, exerciseId);
      return null as T;
    }
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/exercises$/.exec(path);
  if (match && m === "POST") {
    return store.createExercise(match[1], match[2], b as unknown as CreateExercisePayload) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/archive$/.exec(path);
  if (match && m === "POST") return store.archiveWorkout(match[1], match[2]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/unarchive$/.exec(path);
  if (match && m === "POST") return store.unarchiveWorkout(match[1], match[2]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)$/.exec(path);
  if (match) {
    if (m === "PATCH") {
      return store.updateWorkout(match[1], match[2], b as unknown as UpdateWorkoutPayload) as T;
    }
    if (m === "DELETE") {
      store.deleteWorkout(match[1], match[2]);
      return null as T;
    }
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts$/.exec(path);
  if (match) {
    if (m === "GET") return store.listWorkouts(match[1]) as T;
    if (m === "POST")
      return store.createWorkout(match[1], b as unknown as CreateWorkoutPayload) as T;
  }

  // -------- Check-ins (student- and workout-scoped) --------
  match =
    /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/check_ins\/([^/]+)\/exercises\/([^/]+)$/.exec(
      path,
    );
  if (match && m === "PATCH") {
    return store.toggleExerciseCheckIn(
      match[1],
      match[2],
      match[3],
      match[4],
      Boolean(b.completed),
    ) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/check_ins\/([^/]+)\/finish$/.exec(
    path,
  );
  if (match && m === "POST") return store.finishCheckIn(match[1], match[2], match[3]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/check_ins\/([^/]+)\/view$/.exec(path);
  if (match && m === "POST") return store.markCheckInViewed(match[1], match[2], match[3]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/check_ins\/([^/]+)\/reaction$/.exec(
    path,
  );
  if (match && m === "POST") {
    return store.setReaction(match[1], match[2], match[3], String(b.emoji ?? ""), token) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/check_ins\/current$/.exec(path);
  if (match && m === "GET") return store.getCurrentCheckIn(match[1], match[2]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/workouts\/([^/]+)\/check_ins$/.exec(path);
  if (match && m === "POST") return store.startCheckIn(match[1], match[2]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/check_ins$/.exec(path);
  if (match && m === "GET") return store.listCheckIns(match[1]) as T;

  // -------- Feedbacks (student-scoped) --------
  match = /^\/api\/v1\/students\/([^/]+)\/feedbacks$/.exec(path);
  if (match) {
    if (m === "GET") return store.listFeedbacks(match[1]) as T;
    if (m === "POST")
      return store.createFeedback(match[1], b as unknown as CreateFeedbackPayload, token) as T;
  }

  // -------- Biomechanics --------
  match = /^\/api\/v1\/students\/([^/]+)\/biomechanical_assessments\/current$/.exec(path);
  if (match && m === "GET") return store.getCurrentBiomechanics(match[1]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/biomechanical_assessments\/new_assessment$/.exec(path);
  if (match && m === "POST") return store.newBiomechanicsAssessment(match[1]) as T;
  match = /^\/api\/v1\/students\/([^/]+)\/biomechanical_assessments\/upload$/.exec(path);
  if (match && m === "PUT") {
    return store.uploadBiomechanicsSlot(
      match[1],
      b.slot as BiomechanicsSlotBackend,
      String(b.image_url ?? ""),
    ) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/biomechanical_assessments\/remove_image$/.exec(path);
  if (match && m === "DELETE") {
    return store.removeBiomechanicsSlot(match[1], b.slot as BiomechanicsSlotBackend) as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/biomechanical_assessments$/.exec(path);
  if (match && m === "GET") return store.listBiomechanics(match[1]) as T;

  // -------- Bioimpedance measurements --------
  match = /^\/api\/v1\/students\/([^/]+)\/bioimpedance_measurements\/([^/]+)$/.exec(path);
  if (match && m === "DELETE") {
    store.deleteBioimpedance(match[1], match[2]);
    return undefined as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/bioimpedance_measurements$/.exec(path);
  if (match) {
    if (m === "GET") return store.listBioimpedance(match[1]) as T;
    if (m === "POST")
      return store.createBioimpedance(match[1], b as unknown as CreateMeasurementPayload) as T;
  }

  // -------- Structural assessment --------
  match = /^\/api\/v1\/students\/([^/]+)\/structural_assessment$/.exec(path);
  if (match) {
    if (m === "GET") return store.getStructuralAssessment(match[1]) as T;
    if (m === "PUT")
      return store.updateStructuralAssessment(
        match[1],
        b as unknown as UpdateStructuralPayload,
      ) as T;
  }

  // -------- Anamnesis --------
  match = /^\/api\/v1\/students\/([^/]+)\/anamnesis$/.exec(path);
  if (match) {
    if (m === "GET") return store.getAnamnesis(match[1]) as T;
    if (m === "PUT")
      return store.updateAnamnesis(match[1], b as unknown as UpdateAnamnesisPayload) as T;
  }

  // -------- Exams --------
  match = /^\/api\/v1\/students\/([^/]+)\/exams\/([^/]+)$/.exec(path);
  if (match && m === "DELETE") {
    store.deleteExam(match[1], match[2]);
    return null as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/exams$/.exec(path);
  if (match) {
    if (m === "GET") return store.listExams(match[1]) as T;
    if (m === "POST") return store.createExam(match[1], b as unknown as CreateExamPayload) as T;
  }

  // -------- Evolution photos --------
  match = /^\/api\/v1\/students\/([^/]+)\/evolution\/photos\/([^/]+)$/.exec(path);
  if (match && m === "DELETE") {
    store.deleteEvolutionPhoto(match[1], match[2]);
    return undefined as T;
  }
  match = /^\/api\/v1\/students\/([^/]+)\/evolution\/photos$/.exec(path);
  if (match) {
    if (m === "GET") return store.listEvolutionPhotos(match[1]) as T;
    if (m === "POST")
      return store.createEvolutionPhoto(match[1], b as unknown as CreateEvolutionPhotoPayload) as T;
  }

  const err: ApiError = { status: 404, message: `Rota offline não implementada: ${m} ${path}` };
  throw err;
}
