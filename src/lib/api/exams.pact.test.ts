/**
 * Lean coverage (see docs/pact.md): happy path for every endpoint in this
 * domain.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { idString, integer, iso8601DateTime, like, nullValue } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { createExam, deleteExam, fetchExams } from "./exams";

const examTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("2001"),
  name: like("Exame de sangue"),
  description: like("Hemograma completo"),
  file_url: like("https://example.com/exam.pdf"),
  content_type: like("application/pdf"),
  size: integer(12_345),
  uploaded_at: iso8601DateTime(),
  ...overrides,
});

describe("exams API contract", () => {
  it("lists a student's exams", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1901 has an exam")
      .uponReceiving("a request for a student's exams")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1901/exams",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [examTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exams = await fetchExams("1901");
        expect(exams.length).toBeGreaterThan(0);
      });
    });
  });

  it("creates an exam", async () => {
    const pact = createPact();
    const payload = {
      name: "Exame de urina",
      file_url: "https://example.com/urina.pdf",
      content_type: "application/pdf",
      size: 5000,
      uploaded_at: "2026-03-01T00:00:00Z",
    };
    pact
      .given("a student with id 1901 exists for a new exam")
      .uponReceiving("a request to create an exam")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/1901/exams",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: examTemplate({ name: like("Exame de urina"), description: nullValue() }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const exam = await createExam("1901", payload);
        expect(exam.id).toEqual(expect.any(String));
      });
    });
  });

  it("deletes an exam", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1901 has an exam")
      .uponReceiving("a request to delete an exam")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/students/1901/exams/2001",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deleteExam("1901", "2001")).resolves.toBeNull();
      });
    });
  });
});
