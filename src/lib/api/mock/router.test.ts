import { describe, it, expect } from "vitest";
import { resolveMockRequest } from "./router";
import type { Student } from "../students";
import type { Trainer } from "../trainers";
import type { Workout } from "../workouts";
import type { LoginResponse } from "../auth";
import type { ApiError } from "../http";

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
});
