import { describe, it, expect } from "vitest";
import { resolveMockRequest } from "./router";
import type { Student } from "../students";
import type { Trainer } from "../trainers";
import type { Workout } from "../workouts";
import type { LoginResponse } from "../auth";
import type { ApiError } from "../http";
import type { WorkoutCheckIn } from "../check-ins";
import type { CheckInFeedback } from "../check-in-feedbacks";
import type { AttendanceSummary } from "../dashboard";
import type { ChatConversation, ChatMessage } from "../chat";

describe("resolveMockRequest()", () => {
  it("logs in with a valid demo account", async () => {
    const res = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "admin@forlife.app", password: "Admin@2026" },
      token: null,
    });
    expect(res.user.role).toBe("admin");
    expect(res.token).toMatch(/^mock\./);
  });

  it("rejects an invalid login with a 401 ApiError", async () => {
    await expect(
      resolveMockRequest({
        method: "POST",
        path: "/api/v1/auth/login",
        body: { email: "admin@forlife.app", password: "wrong" },
        token: null,
      }),
    ).rejects.toMatchObject({ status: 401 } satisfies Partial<ApiError>);
  });

  it("resolves the current user from a token issued by login", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "aluno@forlife.app", password: "Aluno@2026" },
      token: null,
    });
    const me = await resolveMockRequest<{ id: string }>({
      method: "GET",
      path: "/api/v1/auth/me",
      token: login.token,
    });
    expect(me.id).toBe(login.user.id);
  });

  it("rejects /auth/me without a valid token", async () => {
    await expect(
      resolveMockRequest({ method: "GET", path: "/api/v1/auth/me", token: "garbage" }),
    ).rejects.toMatchObject({ status: 401 } satisfies Partial<ApiError>);
  });

  it("lists, creates, updates and deletes students", async () => {
    const before = await resolveMockRequest<Student[]>({
      method: "GET",
      path: "/api/v1/students",
      token: null,
    });

    const created = await resolveMockRequest<Student>({
      method: "POST",
      path: "/api/v1/students",
      body: {
        name: "Novo Aluno",
        birth_date: "2000-01-01",
        sex: "male",
        email: "n@a.com",
        phone: "",
      },
      token: null,
    });
    expect(created.id).toBeTruthy();

    const updated = await resolveMockRequest<Student>({
      method: "PATCH",
      path: `/api/v1/students/${created.id}`,
      body: { name: "Aluno Renomeado" },
      token: null,
    });
    expect(updated.name).toBe("Aluno Renomeado");

    await resolveMockRequest({
      method: "DELETE",
      path: `/api/v1/students/${created.id}`,
      token: null,
    });

    const after = await resolveMockRequest<Student[]>({
      method: "GET",
      path: "/api/v1/students",
      token: null,
    });
    expect(after.length).toBe(before.length);
  });

  it("returns a 404 ApiError for an unknown student id", async () => {
    await expect(
      resolveMockRequest({ method: "GET", path: "/api/v1/students/does-not-exist", token: null }),
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<ApiError>);
  });

  it("lists trainers with a computed students_count", async () => {
    const trainers = await resolveMockRequest<Trainer[]>({
      method: "GET",
      path: "/api/v1/trainers",
      token: null,
    });
    expect(trainers.length).toBeGreaterThan(0);
    expect(trainers[0]).toHaveProperty("students_count");
  });

  it("creates a workout and then archives it", async () => {
    const workout = await resolveMockRequest<Workout>({
      method: "POST",
      path: "/api/v1/students/student-1/workouts",
      body: { title: "Treino D", focus: "Cardio" },
      token: null,
    });
    expect(workout.status).toBe("active");

    const archived = await resolveMockRequest<Workout>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workout.id}/archive`,
      token: null,
    });
    expect(archived.status).toBe("archived");
  });

  it("closes the position gap left behind when a workout is deleted", async () => {
    const create = (title: string) =>
      resolveMockRequest<Workout>({
        method: "POST",
        path: "/api/v1/students/student-1/workouts",
        body: { title, focus: "Push" },
        token: null,
      });

    const w1 = await create("Gap Test A");
    const w2 = await create("Gap Test B");
    const w3 = await create("Gap Test C");

    await resolveMockRequest({
      method: "DELETE",
      path: `/api/v1/students/student-1/workouts/${w2.id}`,
      token: null,
    });

    const all = await resolveMockRequest<Workout[]>({
      method: "GET",
      path: "/api/v1/students/student-1/workouts",
      token: null,
    });
    const [first, second] = [w1, w3]
      .map((created) => all.find((w) => w.id === created.id)!)
      .sort((a, b) => a.position - b.position);

    expect(second.position - first.position).toBe(1);
  });

  it("subscribes and unsubscribes a push notification endpoint", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "aluno@forlife.app", password: "Aluno@2026" },
      token: null,
    });

    const subscription = await resolveMockRequest<{ id: string; endpoint: string }>({
      method: "POST",
      path: "/api/v1/push_subscriptions",
      body: {
        endpoint: "https://fcm.googleapis.com/fcm/send/mock-endpoint",
        keys: { p256dh: "p256dh-value", auth: "auth-value" },
      },
      token: login.token,
    });
    expect(subscription.id).toBeTruthy();
    expect(subscription.endpoint).toBe("https://fcm.googleapis.com/fcm/send/mock-endpoint");

    await resolveMockRequest({
      method: "DELETE",
      path: "/api/v1/push_subscriptions",
      body: { endpoint: subscription.endpoint },
      token: login.token,
    });
  });

  it("returns a 404 ApiError for a route with no matching handler", async () => {
    await expect(
      resolveMockRequest({ method: "GET", path: "/api/v1/does/not/exist", token: null }),
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<ApiError>);
  });

  // The mock store's state is module-level and persists across tests in this
  // file (see the other tests here creating throwaway workouts by unique
  // title, rather than mutating a shared seed workout) — so every check-in
  // test below creates its own fresh workout instead of reusing the seeded
  // workout-s1-a/workout-s1-b, to avoid one test's in-progress check-in
  // leaking into the next.
  async function createWorkoutWithExercises(count: number) {
    const workout = await resolveMockRequest<Workout>({
      method: "POST",
      path: "/api/v1/students/student-1/workouts",
      body: { title: `Check-in Test ${Math.random()}`, focus: "Push" },
      token: null,
    });
    const exerciseIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const exercise = await resolveMockRequest<{ id: string }>({
        method: "POST",
        path: `/api/v1/students/student-1/workouts/${workout.id}/exercises`,
        body: {
          name: `Exercise ${i}`,
          kind: "strength",
          sets: 3,
          reps: "10",
          rest_seconds: 60,
          muscle_group: "Peito",
        },
        token: null,
      });
      exerciseIds.push(exercise.id);
    }
    return { workoutId: workout.id, exerciseIds };
  }

  it("starts a check-in, toggles exercises, and auto-completes on the last one", async () => {
    const { workoutId, exerciseIds } = await createWorkoutWithExercises(2);

    const current = await resolveMockRequest<WorkoutCheckIn | null>({
      method: "GET",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/current`,
      token: null,
    });
    expect(current).toBeNull();

    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });
    expect(started.status).toBe("in_progress");

    const firstToggle = await resolveMockRequest<WorkoutCheckIn>({
      method: "PATCH",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/exercises/${exerciseIds[0]}`,
      body: { completed: true },
      token: null,
    });
    expect(firstToggle.status).toBe("in_progress");
    expect(firstToggle.exercises_completed).toBe(1);

    const secondToggle = await resolveMockRequest<WorkoutCheckIn>({
      method: "PATCH",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/exercises/${exerciseIds[1]}`,
      body: { completed: true },
      token: null,
    });
    expect(secondToggle.status).toBe("completed");
    expect(secondToggle.exercises_completed).toBe(2);
  });

  it("rejects starting a second check-in while one is already in progress", async () => {
    const { workoutId } = await createWorkoutWithExercises(1);
    await resolveMockRequest({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });

    await expect(
      resolveMockRequest({
        method: "POST",
        path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
        token: null,
      }),
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<ApiError>);
  });

  it("rejects starting a check-in on an archived workout", async () => {
    await expect(
      resolveMockRequest({
        method: "POST",
        path: "/api/v1/students/student-1/workouts/workout-s1-c/check_ins",
        token: null,
      }),
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<ApiError>);
  });

  it("finishes a check-in manually, even with exercises still pending", async () => {
    const { workoutId } = await createWorkoutWithExercises(1);
    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });

    const finished = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/finish`,
      token: null,
    });
    expect(finished.status).toBe("completed");
    expect(finished.exercises_completed).toBe(0);
  });

  it("auto-confirms the personal's side on a check-in started by a logged-in personal", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "personal@forlife.app", password: "Personal@2026" },
      token: null,
    });
    const { workoutId } = await createWorkoutWithExercises(1);

    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: login.token,
    });

    expect(started.personal_confirmed_at).not.toBeNull();
    expect(started.student_confirmed_at).toBeNull();
  });

  it("defaults to auto-confirming the student's side without a resolvable session", async () => {
    const { workoutId } = await createWorkoutWithExercises(1);

    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });

    expect(started.student_confirmed_at).not.toBeNull();
    expect(started.personal_confirmed_at).toBeNull();
  });

  it("confirms a check-in the aluno performed themselves, making it count toward the personal's cycle", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "personal@forlife.app", password: "Personal@2026" },
      token: null,
    });

    const confirmed = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: "/api/v1/students/student-1/workouts/workout-s1-a/check_ins/check-in-s1-a-1/confirm",
      token: login.token,
    });

    expect(confirmed.personal_confirmed_at).not.toBeNull();
    expect(confirmed.student_confirmed_at).not.toBeNull();
  });

  it("lists a student's check-in history across workouts", async () => {
    const history = await resolveMockRequest<WorkoutCheckIn[]>({
      method: "GET",
      path: "/api/v1/students/student-1/check_ins",
      token: null,
    });
    expect(history.some((c) => c.id === "check-in-s1-a-1")).toBe(true);
  });

  it("sends feedback (text) to a check-in and reflects it in check-in history", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "personal@forlife.app", password: "Personal@2026" },
      token: null,
    });
    const { workoutId } = await createWorkoutWithExercises(1);
    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });
    const finished = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/finish`,
      token: null,
    });

    const created = await resolveMockRequest<CheckInFeedback>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${finished.id}/feedbacks`,
      body: { message: "Muito bem no treino de hoje!" },
      token: login.token,
    });
    expect(created.message).toBe("Muito bem no treino de hoje!");
    expect(created.author_name).toBe(login.user.name);
    expect(created.workout_check_in_id).toBe(finished.id);

    const history = await resolveMockRequest<WorkoutCheckIn[]>({
      method: "GET",
      path: "/api/v1/students/student-1/check_ins",
      token: null,
    });
    const match = history.find((c) => c.id === finished.id);
    expect(match?.feedbacks.some((f) => f.id === created.id)).toBe(true);
  });

  it("rejects feedback for a check-in that is still in progress", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "personal@forlife.app", password: "Personal@2026" },
      token: null,
    });
    const { workoutId } = await createWorkoutWithExercises(1);
    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });

    await expect(
      resolveMockRequest({
        method: "POST",
        path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/feedbacks`,
        body: { message: "Muito bem!" },
        token: login.token,
      }),
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<ApiError>);
  });

  it("sends an emoji reaction and reflects it in the completed check-ins list", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "personal@forlife.app", password: "Personal@2026" },
      token: null,
    });
    const { workoutId } = await createWorkoutWithExercises(1);
    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });
    const finished = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/finish`,
      token: null,
    });

    const reaction = await resolveMockRequest<CheckInFeedback>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${finished.id}/feedbacks`,
      body: { emoji: "🔥" },
      token: login.token,
    });
    expect(reaction.emoji).toBe("🔥");

    const completed = await resolveMockRequest<WorkoutCheckIn[]>({
      method: "GET",
      path: "/api/v1/completed_check_ins",
      token: null,
    });
    const match = completed.find((c) => c.id === finished.id);
    expect(match?.feedbacks.some((f) => f.emoji === "🔥")).toBe(true);
  });

  it("rejects emoji feedback for a check-in that is still in progress", async () => {
    const login = await resolveMockRequest<LoginResponse>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: { email: "personal@forlife.app", password: "Personal@2026" },
      token: null,
    });
    const { workoutId } = await createWorkoutWithExercises(1);
    const started = await resolveMockRequest<WorkoutCheckIn>({
      method: "POST",
      path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins`,
      token: null,
    });

    await expect(
      resolveMockRequest({
        method: "POST",
        path: `/api/v1/students/student-1/workouts/${workoutId}/check_ins/${started.id}/feedbacks`,
        body: { emoji: "🔥" },
        token: login.token,
      }),
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<ApiError>);
  });

  it("lists completed check-ins across students", async () => {
    const completed = await resolveMockRequest<WorkoutCheckIn[]>({
      method: "GET",
      path: "/api/v1/completed_check_ins",
      token: null,
    });
    expect(completed.every((c) => c.status === "completed")).toBe(true);
    expect(completed.some((c) => c.id === "check-in-s1-a-1")).toBe(true);
  });

  it("returns the dashboard attendance summary", async () => {
    const summary = await resolveMockRequest<AttendanceSummary>({
      method: "GET",
      path: "/api/v1/dashboard/attendance",
      params: { range: "year" },
      token: null,
    });
    expect(summary.total_check_ins).toBeGreaterThanOrEqual(1);
    expect(summary).toHaveProperty("active_students");
  });

  describe("chat", () => {
    async function loginAs(email: string, password: string) {
      const res = await resolveMockRequest<LoginResponse>({
        method: "POST",
        path: "/api/v1/auth/login",
        body: { email, password },
        token: null,
      });
      return res.token;
    }

    it("lists the personal's conversations, including the seeded student", async () => {
      const token = await loginAs("personal@forlife.app", "Personal@2026");
      const conversations = await resolveMockRequest<ChatConversation[]>({
        method: "GET",
        path: "/api/v1/chat/conversations",
        token,
      });
      expect(conversations.some((c) => c.student_id === "student-1")).toBe(true);
    });

    it("lists a conversation's messages in chronological order", async () => {
      const token = await loginAs("personal@forlife.app", "Personal@2026");
      const messages = await resolveMockRequest<ChatMessage[]>({
        method: "GET",
        path: "/api/v1/chat/conversations/student-1/messages",
        token,
      });
      expect(messages.length).toBeGreaterThanOrEqual(3);
      const timestamps = messages.map((m) => Date.parse(m.created_at));
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    });

    it("lets the personal send a message, deriving sender_role from their own role", async () => {
      const token = await loginAs("personal@forlife.app", "Personal@2026");
      const message = await resolveMockRequest<ChatMessage>({
        method: "POST",
        path: "/api/v1/chat/conversations/student-1/messages",
        body: { body: "Como foi o treino de hoje?" },
        token,
      });
      expect(message.sender_role).toBe("personal");
      expect(message.body).toBe("Como foi o treino de hoje?");
      expect(message.read_at).toBeNull();
    });

    it("lets the aluno send a message on their own conversation", async () => {
      const token = await loginAs("aluno@forlife.app", "Aluno@2026");
      const message = await resolveMockRequest<ChatMessage>({
        method: "POST",
        path: "/api/v1/chat/conversations/student-1/messages",
        body: { body: "Foi ótimo!" },
        token,
      });
      expect(message.sender_role).toBe("aluno");
    });

    it("marks the other side's unread messages as read", async () => {
      const token = await loginAs("personal@forlife.app", "Personal@2026");
      const result = await resolveMockRequest<{ read: number }>({
        method: "POST",
        path: "/api/v1/chat/conversations/student-1/read",
        token,
      });
      expect(result.read).toBeGreaterThanOrEqual(0);

      const messages = await resolveMockRequest<ChatMessage[]>({
        method: "GET",
        path: "/api/v1/chat/conversations/student-1/messages",
        token,
      });
      expect(messages.filter((m) => m.sender_role === "aluno").every((m) => m.read_at)).toBe(true);
    });

    it("forbids an aluno from reading another student's conversation", async () => {
      const token = await loginAs("aluno@forlife.app", "Aluno@2026");
      await expect(
        resolveMockRequest({
          method: "GET",
          path: "/api/v1/chat/conversations/student-2/messages",
          token,
        }),
      ).rejects.toMatchObject({ status: 403 } satisfies Partial<ApiError>);
    });
  });
});
