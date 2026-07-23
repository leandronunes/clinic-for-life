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
  errorWithCodeBody,
  idString,
  integer,
  iso8601Date,
  iso8601DateTime,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  acceptStudentMigration,
  createStudent,
  deleteStudent,
  fetchStudent,
  fetchStudents,
  rejectStudentMigration,
  requestStudentMigration,
  updateStudent,
} from "./students";

const SEXES = ["female", "male", "other"];
const STATUSES = ["active", "inactive"];

const studentTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("501"),
  name: like("Aluno Exemplo"),
  cpf: nullValue(),
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

    it("creates a student with a cpf", async () => {
      const pact = createPact();
      const payload = {
        name: "Novo Aluno",
        cpf: "11122233344",
        birth_date: "1998-05-20",
        sex: "male" as const,
        email: "novo.aluno.cpf@forlife.app",
        phone: "(11) 96666-0000",
        trainer_id: "10",
      };
      pact
        .given("an admin is authenticated")
        .uponReceiving("a request to create a student with a cpf")
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
              cpf: like("11122233344"),
              sex: enumString(SEXES, "male"),
              trainer_id: idString("10"),
            }),
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const student = await createStudent(payload);
          expect(student.cpf).toEqual(expect.any(String));
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

    it("rejects a same-organization duplicate e-mail with a machine-readable code", async () => {
      const pact = createPact();
      const payload = {
        name: "Novo Aluno",
        birth_date: "1998-05-20",
        sex: "male" as const,
        email: "duplicado@forlife.app",
        phone: "(11) 96666-0000",
      };
      pact
        .given(
          "a student with the e-mail duplicado@forlife.app already exists in the admin's own organization",
        )
        .uponReceiving(
          "a request to create a student with an e-mail already used in the same organization",
        )
        .withRequest({
          method: "POST",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: payload,
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorWithCodeBody(
            "Já existe um aluno cadastrado com este e-mail nesta organização.",
            "email_taken_same_organization",
          ),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(createStudent(payload)).rejects.toMatchObject({
            status: 422,
            code: "email_taken_same_organization",
          });
        });
      });
    });

    it("rejects a cross-organization duplicate e-mail with a machine-readable code", async () => {
      const pact = createPact();
      const payload = {
        name: "Novo Aluno",
        birth_date: "1998-05-20",
        sex: "male" as const,
        email: "outraorg@forlife.app",
        phone: "(11) 96666-0000",
      };
      pact
        .given("a student with the e-mail outraorg@forlife.app exists in another organization")
        .uponReceiving(
          "a request to create a student with an e-mail already used in another organization",
        )
        .withRequest({
          method: "POST",
          path: "/api/v1/students",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: payload,
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorWithCodeBody(
            "Este e-mail já está cadastrado em outra organização.",
            "email_taken_other_organization",
          ),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(createStudent(payload)).rejects.toMatchObject({
            status: 422,
            code: "email_taken_other_organization",
          });
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

    it("updates the cpf", async () => {
      const pact = createPact();
      pact
        .given("a student with id 502 exists")
        .uponReceiving("a request to update a student's cpf")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/students/502",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: { cpf: "11122233344" },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: studentTemplate({ id: idString("502"), cpf: like("11122233344") }),
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const student = await updateStudent("502", { cpf: "11122233344" });
          expect(student.cpf).toEqual(expect.any(String));
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

  const migrationRequestTemplate = (overrides: Record<string, unknown> = {}) => ({
    id: idString("6002"),
    status: enumString(["pending", "accepted", "rejected"], "pending"),
    target_organization_name: like("Academia Vida Ativa"),
    requested_by_name: like("Dra. Camila Andrade"),
    created_at: iso8601DateTime(),
    ...overrides,
  });

  describe("POST /api/v1/students/migration_requests", () => {
    it("creates a pending migration request for a student in another organization", async () => {
      const pact = createPact();
      pact
        .given(
          "an admin is authenticated and a student with id 6001 exists in another organization",
        )
        .uponReceiving("a request to invite a cross-organization student to migrate")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/migration_requests",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: { email: "convidado@forlife.app" },
        })
        .willRespondWith({
          status: 201,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: migrationRequestTemplate() },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const request = await requestStudentMigration("convidado@forlife.app");
          expect(request.status).toEqual("pending");
        });
      });
    });

    it("returns 404 when no student matches the e-mail", async () => {
      const pact = createPact();
      pact
        .given("an admin is authenticated")
        .uponReceiving("a request to invite a student who doesn't exist")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/migration_requests",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: { email: "ninguem@forlife.app" },
        })
        .willRespondWith({
          status: 404,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorWithCodeBody("Nenhum aluno encontrado com este e-mail.", "student_not_found"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(requestStudentMigration("ninguem@forlife.app")).rejects.toMatchObject({
            status: 404,
            code: "student_not_found",
          });
        });
      });
    });

    it("rejects a personal from creating a migration request", async () => {
      const pact = createPact();
      pact
        .given("a personal is authenticated")
        .uponReceiving("a request from a personal to invite a cross-organization student")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/migration_requests",
          headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
          body: { email: "convidado@forlife.app" },
        })
        .willRespondWith({
          status: 403,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Forbidden"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          await expect(requestStudentMigration("convidado@forlife.app")).rejects.toMatchObject({
            status: 403,
          });
        });
      });
    });
  });

  describe("POST /api/v1/students/migration_requests/:id/accept", () => {
    it("lets the affected student accept the migration", async () => {
      const pact = createPact();
      pact
        .given("student 6001 has a pending migration request 6002")
        .uponReceiving("a request from the affected student to accept a migration request")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/migration_requests/6002/accept",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: migrationRequestTemplate({ status: "accepted" }) },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const request = await acceptStudentMigration("6002");
          expect(request.status).toEqual("accepted");
        });
      });
    });
  });

  describe("POST /api/v1/students/migration_requests/:id/reject", () => {
    it("lets the affected student reject the migration", async () => {
      const pact = createPact();
      pact
        .given("student 6001 has a pending migration request 6002")
        .uponReceiving("a request from the affected student to reject a migration request")
        .withRequest({
          method: "POST",
          path: "/api/v1/students/migration_requests/6002/reject",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: migrationRequestTemplate({ status: "rejected" }) },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const request = await rejectStudentMigration("6002");
          expect(request.status).toEqual("rejected");
        });
      });
    });
  });
});
