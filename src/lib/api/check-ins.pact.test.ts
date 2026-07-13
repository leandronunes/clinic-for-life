/**
 * Lean coverage (see docs/pact.md): happy path for every endpoint in this
 * domain, plus the null-current and business-error shapes that differ
 * structurally from the happy path.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { enumString, idString, integer, like, nullValue } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  fetchCurrentCheckIn,
  startCheckIn,
  finishCheckIn,
  toggleExerciseCheckIn,
  fetchCheckInHistory,
  fetchCompletedCheckIns,
  markCheckInViewed,
} from "./check-ins";

const STATUSES = ["in_progress", "completed"];

const checkInTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("2331"),
  workout_id: idString("2311"),
  workout_title: like("Treino A"),
  student_id: idString("2301"),
  student_name: like("Julia Ferreira"),
  status: enumString(STATUSES, "in_progress"),
  exercises_completed: integer(0),
  exercises_total: integer(1),
  completed_exercise_ids: like([]),
  started_at: like("2026-07-12T10:00:00Z"),
  completed_at: nullValue(),
  viewed_at: nullValue(),
  feedbacks: like([]),
  reactions: like([]),
  ...overrides,
});

describe("check-ins API contract", () => {
  it("returns null when there is no check-in in progress", async () => {
    const pact = createPact();
    pact
      .given("a student with id 2301 has an active workout 2311 with no check-in in progress")
      .uponReceiving("a request for the current check-in when none is in progress")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/2301/workouts/2311/check_ins/current",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: nullValue() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIn = await fetchCurrentCheckIn("2301", "2311");
        expect(checkIn).toBeNull();
      });
    });
  });

  it("starts a check-in", async () => {
    const pact = createPact();
    pact
      .given("a student with id 2301 has an active workout 2311 with no check-in in progress")
      .uponReceiving("a request to start a check-in")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2301/workouts/2311/check_ins",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: checkInTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIn = await startCheckIn("2301", "2311");
        expect(checkIn.status).toEqual("in_progress");
      });
    });
  });

  it("returns the check-in currently in progress", async () => {
    const pact = createPact();
    pact
      .given(
        "student 2301 has an in-progress check-in 2331 on workout 2311 with exercise 2321 pending",
      )
      .uponReceiving("a request for the current check-in when one is in progress")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/2301/workouts/2311/check_ins/current",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: checkInTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIn = await fetchCurrentCheckIn("2301", "2311");
        expect(checkIn?.id).toEqual(expect.any(String));
      });
    });
  });

  it("toggles an exercise as completed", async () => {
    const pact = createPact();
    pact
      .given(
        "student 2301 has an in-progress check-in 2331 on workout 2311 with exercise 2321 pending",
      )
      .uponReceiving("a request to mark an exercise as completed")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/2301/workouts/2311/check_ins/2331/exercises/2321",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { completed: true },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: checkInTemplate({
            exercises_completed: integer(1),
            completed_exercise_ids: like(["2321"]),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIn = await toggleExerciseCheckIn("2301", "2311", "2331", "2321", true);
        expect(checkIn.exercises_completed).toEqual(expect.any(Number));
      });
    });
  });

  it("finishes a check-in", async () => {
    const pact = createPact();
    pact
      .given(
        "student 2301 has an in-progress check-in 2331 on workout 2311 with exercise 2321 pending",
      )
      .uponReceiving("a request to finish a check-in")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2301/workouts/2311/check_ins/2331/finish",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: checkInTemplate({
            status: enumString(STATUSES, "completed"),
            completed_at: like("2026-07-12T10:30:00Z"),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIn = await finishCheckIn("2301", "2311", "2331");
        expect(checkIn.status).toEqual("completed");
      });
    });
  });

  it("lists the check-in history for a student", async () => {
    const pact = createPact();
    pact
      .given("student 2301 has a completed check-in 2351 on workout 2341 in their history")
      .uponReceiving("a request for a student's check-in history")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/2301/check_ins",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: [
            checkInTemplate({
              id: idString("2351"),
              workout_id: idString("2341"),
              status: enumString(STATUSES, "completed"),
              completed_at: like("2026-07-12T10:30:00Z"),
            }),
          ],
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const history = await fetchCheckInHistory("2301");
        expect(history.length).toBeGreaterThan(0);
      });
    });
  });

  it("marks a check-in as viewed", async () => {
    const pact = createPact();
    pact
      .given("student 2301 has a completed check-in 2352 on workout 2342 to mark as viewed")
      .uponReceiving("a request to mark a check-in as viewed")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2301/workouts/2342/check_ins/2352/view",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: checkInTemplate({
            id: idString("2352"),
            workout_id: idString("2342"),
            status: enumString(STATUSES, "completed"),
            completed_at: like("2026-07-12T10:30:00Z"),
            viewed_at: like("2026-07-13T09:00:00Z"),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIn = await markCheckInViewed("2301", "2342", "2352");
        expect(checkIn.viewed_at).toEqual(expect.any(String));
      });
    });
  });

  it("lists completed check-ins across the personal's portfolio", async () => {
    const pact = createPact();
    pact
      .given("a personal has a completed check-in 2621 for student 2601 in their portfolio")
      .uponReceiving("a request for the personal's completed check-ins")
      .withRequest({
        method: "GET",
        path: "/api/v1/completed_check_ins",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: [
            checkInTemplate({
              id: idString("2621"),
              workout_id: idString("2611"),
              student_id: idString("2601"),
              status: enumString(STATUSES, "completed"),
              completed_at: like("2026-07-12T10:30:00Z"),
            }),
          ],
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const checkIns = await fetchCompletedCheckIns();
        expect(checkIns.length).toBeGreaterThan(0);
      });
    });
  });
});
