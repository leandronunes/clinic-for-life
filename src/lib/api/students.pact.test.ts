/**
 * Exhaustive reference contract (see docs/pact.md) — covers every verb,
 * matcher type, and error scenario for the Students domain (index with
 * filters/meta, show, create, update, destroy, role-scoping).
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  eachLike,
  enumString,
  errorArrayBody,
  errorStringBody,
  idString,
  integer,
  iso8601Date,
  iso8601DateTime,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  createStudent,
  deleteStudent,
  fetchStudent,
  fetchStudents,
  updateStudent,
} from "./students";

const SEXES = ["female", "male", "other"];
const STATUSES = ["active", "inactive"];

const studentTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("501"),
  name: like("Aluno Exemplo"),
  birth_date: iso8601Date(),
  sex: enumString(SEXES, "female"),
  email: like("aluno@forlife.app"),
  phone: like("(11) 97777-0000"),
  trainer_id: idString("10"),
  trainer_name: like("Personal Exemplo"),
  status: enumString(STATUSES, "active"),
  health_plan: nullValue(),
  emergency_contact: nullValue(),
  created_at: iso8601DateTime(),
  ...overrides,
});

describe("students API contract", () => {
  describe("GET /api/v1/students", () => {
    it("lists students with a total in meta", async () => {
      const pact = createPact();
      pact
        .given("at least one student exists")
        .uponReceiving("a request for the list of students")
        .withRequest({
          method: "GET",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: eachLike(studentTemplate(), 1), meta: { total: integer(2) } },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const students = await fetchStudents();
          expect(students.length).toBeGreaterThan(0);
        });
      });
    });

    it("returns an empty array when no students exist", async () => {
      const pact = createPact();
      pact
        .given("no students exist")
        .uponReceiving("a request for the list of students when none exist")
        .withRequest({
          method: "GET",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: [], meta: { total: 0 } },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const students = await fetchStudents();
          expect(students).toEqual([]);
        });
      });
    });

    it("filters by status", async () => {
      const pact = createPact();
      pact
        .given("only active students exist")
        .uponReceiving("a request for active students only")
        .withRequest({
          method: "GET",
          path: "/api/v1/students",
          query: { status: "active" },
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: eachLike(studentTemplate({ status: "active" }), 1),
            meta: { total: integer(1) },
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const students = await fetchStudents({ status: "active" });
          expect(students.every((s) => s.status === "active")).toBe(true);
        });
      });
    });
  });

  describe("GET /api/v1/students/:id", () => {
    it("returns a single student", async () => {
      const pact = createPact();
      pact
        .given("a student with id 501 exists")
        .uponReceiving("a request for an existing student")
        .withRequest({
          method: "GET",
          path: "/api/v1/students/501",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: studentTemplate() },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const student = await fetchStudent("501");
          expect(student.id).toEqual(expect.any(String));
        });
      });
    });

    it("returns 404 for a missing student", async () => {
      const pact = createPact();
      pact
        .given("no student exists with the given id")
        .uponReceiving("a request for a student that does not exist")
        .withRequest({
          method: "GET",
          path: "/api/v1/students/999999",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 404,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Couldn't find Student with 'id'=999999"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(fetchStudent("999999")).rejects.toMatchObject({ status: 404 });
        });
      });
    });

    it("returns 403 for a student outside the trainer's portfolio", async () => {
      const pact = createPact();
      pact
        .given("a student with id 504 belongs to another trainer")
        .uponReceiving("a request for a student outside the trainer's portfolio")
        .withRequest({
          method: "GET",
          path: "/api/v1/students/504",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 403,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Forbidden"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(fetchStudent("504")).rejects.toMatchObject({ status: 403 });
        });
      });
    });
  });

  describe("POST /api/v1/students", () => {
    it("creates a student", async () => {
      const pact = createPact();
      const payload = {
        name: "Novo Aluno",
        birth_date: "1998-05-20",
        sex: "male" as const,
        email: "novo.aluno@forlife.app",
        phone: "(11) 96666-0000",
        trainer_id: "10",
      };
      pact
        .given("an admin is authenticated")
        .uponReceiving("a request to create a student")
        .withRequest({
          method: "POST",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: payload,
        })
        .willRespondWith({
          status: 201,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: studentTemplate({
              name: like("Novo Aluno"),
              sex: enumString(SEXES, "male"),
              trainer_id: idString("10"),
            }),
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const student = await createStudent(payload);
          expect(student.id).toEqual(expect.any(String));
        });
      });
    });

    it("rejects creation from a student role", async () => {
      const pact = createPact();
      const payload = {
        name: "Novo Aluno",
        birth_date: "1998-05-20",
        sex: "male" as const,
        email: "novo.aluno@forlife.app",
        phone: "(11) 96666-0000",
      };
      pact
        .given("a student user is authenticated")
        .uponReceiving("a request to create a student from a student role")
        .withRequest({
          method: "POST",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: payload,
        })
        .willRespondWith({
          status: 403,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Forbidden"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(createStudent(payload)).rejects.toMatchObject({ status: 403 });
        });
      });
    });

    it("rejects an invalid payload", async () => {
      const pact = createPact();
      const payload = {
        name: "",
        birth_date: "1998-05-20",
        sex: "male" as const,
        email: "not-an-email",
        phone: "(11) 96666-0000",
      };
      pact
        .given("an admin is authenticated")
        .uponReceiving("a request to create a student with invalid data")
        .withRequest({
          method: "POST",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: payload,
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorArrayBody("Name can't be blank"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(createStudent(payload)).rejects.toMatchObject({ status: 422 });
        });
      });
    });
  });

  describe("PATCH /api/v1/students/:id", () => {
    it("updates a student", async () => {
      const pact = createPact();
      pact
        .given("a student with id 502 exists")
        .uponReceiving("a request to update a student")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/students/502",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: { phone: "(11) 95555-0000" },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: studentTemplate({ id: idString("502"), phone: like("(11) 95555-0000") }) },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const student = await updateStudent("502", { phone: "(11) 95555-0000" });
          expect(student.phone).toEqual(expect.any(String));
        });
      });
    });

    it("returns 404 when updating a missing student", async () => {
      const pact = createPact();
      pact
        .given("no student exists with the given id")
        .uponReceiving("a request to update a student that does not exist")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/students/999999",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: { phone: "(11) 95555-0000" },
        })
        .willRespondWith({
          status: 404,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Couldn't find Student with 'id'=999999"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(updateStudent("999999", { phone: "(11) 95555-0000" })).rejects.toMatchObject(
            {
              status: 404,
            },
          );
        });
      });
    });
  });

  describe("DELETE /api/v1/students/:id", () => {
    it("deletes a student", async () => {
      const pact = createPact();
      pact
        .given("a student with id 503 exists")
        .uponReceiving("a request to delete a student")
        .withRequest({
          method: "DELETE",
          path: "/api/v1/students/503",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({ status: 204 });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(deleteStudent("503")).resolves.toBeUndefined();
        });
      });
    });

    it("rejects deletion from a non-admin role", async () => {
      const pact = createPact();
      pact
        .given("a student with id 503 exists and a non-admin is authenticated")
        .uponReceiving("a request to delete a student from a non-admin role")
        .withRequest({
          method: "DELETE",
          path: "/api/v1/students/503",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 403,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Forbidden"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(deleteStudent("503")).rejects.toMatchObject({ status: 403 });
        });
      });
    });
  });
});
