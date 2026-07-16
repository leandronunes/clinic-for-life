/**
 * Lean coverage (see docs/pact.md): happy path + applicable auth/validation
 * errors for every endpoint in this domain (workouts + nested exercises).
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  decimal,
  enumString,
  errorStringBody,
  idString,
  integer,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import type { CreateExercisePayload } from "./workouts";
import {
  archiveWorkout,
  createExercise,
  createWorkout,
  deleteExercise,
  deleteWorkout,
  reorderExercises,
  reorderWorkouts,
  unarchiveWorkout,
  updateExercise,
  updateWorkout,
} from "./workouts";
import { http } from "./http";

const WORKOUT_STATUSES = ["active", "archived"];
const EXERCISE_KINDS = ["strength", "cardio", "mobility"];
const DISTANCE_UNITS = ["m", "km"];

const exerciseTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("901"),
  position: integer(1),
  kind: enumString(EXERCISE_KINDS, "strength"),
  name: like("Supino reto"),
  sets: integer(3),
  reps: like("10-12"),
  load_kg: like(20),
  rest_seconds: integer(60),
  muscle_group: like("Peito"),
  duration_seconds: nullValue(),
  distance_value: nullValue(),
  distance_unit: nullValue(),
  hr_zone: nullValue(),
  heart_rate_bpm: nullValue(),
  video_url: like("https://www.youtube.com/embed/abc"),
  notes: nullValue(),
  ...overrides,
});

const workoutTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("801"),
  position: integer(1),
  title: like("Treino A"),
  focus: like("Push"),
  status: enumString(WORKOUT_STATUSES, "active"),
  created_at: like("2026-01-01"),
  archived_at: nullValue(),
  exercises: [exerciseTemplate()],
  ...overrides,
});

describe("workouts API contract", () => {
  it("lists a student's workouts", async () => {
    const pact = createPact();
    pact
      .given("a student with id 701 has workouts")
      .uponReceiving("a request for a student's workouts")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/701/workouts",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [workoutTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const workouts = await http.get("/api/v1/students/701/workouts");
        expect(workouts).toBeDefined();
      });
    });
  });

  it("creates a workout", async () => {
    const pact = createPact();
    pact
      .given("a student with id 701 exists for workout creation")
      .uponReceiving("a request to create a workout")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { title: "Treino B", focus: "Pull" },
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: workoutTemplate({ title: like("Treino B"), focus: like("Pull"), exercises: [] }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const workout = await createWorkout("701", { title: "Treino B", focus: "Pull" });
        expect(workout.id).toEqual(expect.any(String));
      });
    });
  });

  it("rejects a write from a student role", async () => {
    const pact = createPact();
    pact
      .given("a student with id 701 exists and a non-admin student is authenticated")
      .uponReceiving("a request to create a workout from a student role")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { title: "Treino B", focus: "Pull" },
      })
      .willRespondWith({
        status: 403,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Forbidden"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(
          createWorkout("701", { title: "Treino B", focus: "Pull" }),
        ).rejects.toMatchObject({
          status: 403,
        });
      });
    });
  });

  it("updates a workout", async () => {
    const pact = createPact();
    pact
      .given("an active workout 801 exists for student 701")
      .uponReceiving("a request to update a workout")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/701/workouts/801",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { title: "Treino Atualizado" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: workoutTemplate({ title: like("Treino Atualizado"), exercises: [] }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const workout = await updateWorkout("701", "801", { title: "Treino Atualizado" });
        expect(workout.title).toEqual(expect.any(String));
      });
    });
  });

  it("archives a workout", async () => {
    const pact = createPact();
    pact
      .given("an active workout 801 exists for student 701")
      .uponReceiving("a request to archive a workout")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts/801/archive",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: workoutTemplate({
            status: "archived",
            archived_at: like("2026-01-01"),
            exercises: [],
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const workout = await archiveWorkout("701", "801");
        expect(workout.status).toEqual("archived");
      });
    });
  });

  it("deletes a workout", async () => {
    const pact = createPact();
    pact
      .given("an active workout 801 exists for student 701")
      .uponReceiving("a request to delete a workout")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/students/701/workouts/801",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deleteWorkout("701", "801")).resolves.toBeNull();
      });
    });
  });

  it("unarchives a workout", async () => {
    const pact = createPact();
    pact
      .given("an archived workout 802 exists for student 701")
      .uponReceiving("a request to unarchive a workout")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts/802/unarchive",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: workoutTemplate({ id: idString("802"), status: "active", exercises: [] }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const workout = await unarchiveWorkout("701", "802");
        expect(workout.status).toEqual("active");
      });
    });
  });

  it("reorders workouts", async () => {
    const pact = createPact();
    pact
      .given("student 701 has two active workouts to reorder")
      .uponReceiving("a request to reorder workouts")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/701/workouts/reorder",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { ordered_ids: ["804", "803"] },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: [
            workoutTemplate({ id: idString("804"), exercises: [] }),
            workoutTemplate({ id: idString("803"), exercises: [] }),
          ],
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const workouts = await reorderWorkouts("701", ["804", "803"]);
        expect(workouts.length).toBe(2);
      });
    });
  });

  it("creates an exercise", async () => {
    const pact = createPact();
    const payload = {
      name: "Agachamento",
      sets: 4,
      reps: "8-10",
      rest_seconds: 90,
      muscle_group: "Pernas",
    };
    pact
      .given("workout 801 exists for student 701 to add exercises to")
      .uponReceiving("a request to create an exercise")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts/801/exercises",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: exerciseTemplate({
            name: like("Agachamento"),
            load_kg: nullValue(),
            video_url: nullValue(),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercise = await createExercise("701", "801", payload);
        expect(exercise.id).toEqual(expect.any(String));
      });
    });
  });

  it("creates a cardio exercise", async () => {
    const pact = createPact();
    const payload: CreateExercisePayload = {
      kind: "cardio",
      name: "Corrida na esteira",
      duration_seconds: 1200,
      distance_value: 5,
      distance_unit: "km",
      hr_zone: 2,
    };
    pact
      .given("workout 801 exists for student 701 to add exercises to")
      .uponReceiving("a request to create a cardio exercise")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts/801/exercises",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: exerciseTemplate({
            kind: enumString(EXERCISE_KINDS, "cardio"),
            name: like("Corrida na esteira"),
            sets: integer(1),
            reps: nullValue(),
            load_kg: nullValue(),
            muscle_group: nullValue(),
            duration_seconds: integer(1200),
            distance_value: decimal(5),
            distance_unit: enumString(DISTANCE_UNITS, "km"),
            hr_zone: integer(2),
            heart_rate_bpm: nullValue(),
            video_url: nullValue(),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercise = await createExercise("701", "801", payload);
        expect(exercise.kind).toBe("cardio");
        expect(exercise.duration_seconds).toEqual(expect.any(Number));
      });
    });
  });

  it("creates a mobility exercise", async () => {
    const pact = createPact();
    const payload: CreateExercisePayload = {
      kind: "mobility",
      name: "Alongamento de quadril",
      sets: 2,
      reps: "10",
    };
    pact
      .given("workout 801 exists for student 701 to add exercises to")
      .uponReceiving("a request to create a mobility exercise")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/701/workouts/801/exercises",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: exerciseTemplate({
            kind: enumString(EXERCISE_KINDS, "mobility"),
            name: like("Alongamento de quadril"),
            sets: integer(2),
            reps: like("10"),
            load_kg: nullValue(),
            muscle_group: nullValue(),
            video_url: nullValue(),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercise = await createExercise("701", "801", payload);
        expect(exercise.kind).toBe("mobility");
      });
    });
  });

  it("updates an exercise", async () => {
    const pact = createPact();
    pact
      .given("workout 801 for student 701 has exercise 901")
      .uponReceiving("a request to update an exercise")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/701/workouts/801/exercises/901",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { sets: 5 },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: exerciseTemplate({ sets: integer(5) }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercise = await updateExercise("701", "801", "901", { sets: 5 });
        expect(exercise.sets).toEqual(expect.any(Number));
      });
    });
  });

  it("clears an exercise's notes", async () => {
    const pact = createPact();
    pact
      .given("workout 801 for student 701 has exercise 901 with notes")
      .uponReceiving("a request to clear an exercise's notes")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/701/workouts/801/exercises/901",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { notes: null },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: exerciseTemplate({ notes: nullValue() }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercise = await updateExercise("701", "801", "901", { notes: null });
        expect(exercise.notes).toBeNull();
      });
    });
  });

  it("lets the student update only the load on their own exercise", async () => {
    const pact = createPact();
    pact
      .given("workout 806 for student 701 has exercise 905, and that student is authenticated")
      .uponReceiving("a request from the student to update the load of their own exercise")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/701/workouts/806/exercises/905",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { load_kg: 22.5 },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: exerciseTemplate({
            id: idString("905"),
            load_kg: decimal(22.5),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercise = await updateExercise("701", "806", "905", { load_kg: 22.5 });
        expect(exercise.load_kg).toEqual(expect.any(Number));
      });
    });
  });

  it("reorders exercises", async () => {
    const pact = createPact();
    pact
      .given("workout 801 for student 701 has two exercises to reorder")
      .uponReceiving("a request to reorder exercises")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/students/701/workouts/801/exercises/reorder",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { ordered_ids: ["903", "902"] },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: [
            exerciseTemplate({ id: idString("903") }),
            exerciseTemplate({ id: idString("902") }),
          ],
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exercises = await reorderExercises("701", "801", ["903", "902"]);
        expect(exercises.length).toBe(2);
      });
    });
  });

  it("deletes an exercise", async () => {
    const pact = createPact();
    pact
      .given("workout 805 for student 701 has exercise 904 to delete")
      .uponReceiving("a request to delete an exercise")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/students/701/workouts/805/exercises/904",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deleteExercise("701", "805", "904")).resolves.toBeNull();
      });
    });
  });
});
