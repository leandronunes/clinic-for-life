import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  enumString,
  errorStringBody,
  idString,
  integer,
  iso8601DateTime,
  like,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchAttendanceCycleHistory, renewAttendanceCycle } from "./attendance-cycles";

const CYCLE_STATUSES = ["completed", "exceeded"];

const cycleTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1"),
  student_id: idString("2411"),
  contracted_workouts_per_cycle: integer(8),
  completed_workouts: integer(6),
  percentage: integer(75),
  status: enumString(CYCLE_STATUSES, "completed"),
  started_at: iso8601DateTime(),
  ended_at: iso8601DateTime(),
  ...overrides,
});

describe("attendance cycles API contract", () => {
  describe("GET /api/v1/students/:student_id/attendance_cycles", () => {
    it("lists closed cycles for a student", async () => {
      const pact = createPact();
      pact
        .given("a student with id 2411 has a closed attendance cycle")
        .uponReceiving("a request for a student's attendance cycle history")
        .withRequest({
          method: "GET",
          path: "/api/v1/students/2411/attendance_cycles",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: [cycleTemplate()] },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const history = await fetchAttendanceCycleHistory("2411");
          expect(history.length).toBeGreaterThan(0);
        });
      });
    });

    it("returns an empty array when the student has no closed cycles", async () => {
      const pact = createPact();
      pact
        .given("a student with id 2412 has no closed attendance cycles")
        .uponReceiving("a request for attendance cycle history with none closed")
        .withRequest({
          method: "GET",
          path: "/api/v1/students/2412/attendance_cycles",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: [] },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const history = await fetchAttendanceCycleHistory("2412");
          expect(history).toEqual([]);
        });
      });
    });

    it("returns 403 for a student outside the trainer's portfolio", async () => {
      const pact = createPact();
      pact
        .given("a student with id 2413 belongs to another trainer")
        .uponReceiving("a request for attendance cycle history outside the trainer's portfolio")
        .withRequest({
          method: "GET",
          path: "/api/v1/students/2413/attendance_cycles",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 403,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Forbidden"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(fetchAttendanceCycleHistory("2413")).rejects.toMatchObject({ status: 403 });
        });
      });
    });
  });

  describe("POST /api/v1/students/:id/renew_cycle", () => {
    it("renews the cycle", async () => {
      const pact = createPact();
      pact
        .given("a student with id 2401 has a contract to renew")
        .uponReceiving("a request to renew a student's attendance cycle")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/2401/renew_cycle",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: {
              id: idString("2401"),
              name: like("Aluno Exemplo"),
              birth_date: like("1995-01-01"),
              sex: enumString(["female", "male", "other"], "female"),
              email: like("aluno@forlife.app"),
              phone: like("(11) 97777-0000"),
              trainer_id: idString("10"),
              trainer_name: like("Personal Exemplo"),
              status: enumString(["active", "inactive"], "active"),
              partner_card_enabled: like(true),
              health_plan: like(null),
              emergency_contact: like(null),
              contracted_workouts_per_cycle: integer(8),
              cycle_started_at: iso8601DateTime(),
              created_at: iso8601DateTime(),
            },
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const student = await renewAttendanceCycle("2401");
          expect(student.cycle_started_at).toEqual(expect.any(String));
        });
      });
    });

    it("rejects renewal when the student has no contracted quota", async () => {
      const pact = createPact();
      pact
        .given("a student with id 2402 has no contracted quota")
        .uponReceiving("a request to renew a cycle for a student with no contract")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/2402/renew_cycle",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Aluno não possui treinos contratados por ciclo definidos"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(renewAttendanceCycle("2402")).rejects.toMatchObject({ status: 422 });
        });
      });
    });

    it("returns 403 when renewing another trainer's student", async () => {
      const pact = createPact();
      pact
        .given("a student with id 2403 belongs to another trainer and has a contract")
        .uponReceiving("a request to renew a cycle outside the trainer's portfolio")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/2403/renew_cycle",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 403,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Forbidden"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(renewAttendanceCycle("2403")).rejects.toMatchObject({ status: 403 });
        });
      });
    });
  });
});
