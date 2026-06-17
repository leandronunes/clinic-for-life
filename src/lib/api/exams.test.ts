import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchExams, createExam, deleteExam, type Exam } from "./exams";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn(), del: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockDel = vi.mocked(http.del);

const exam: Exam = {
  id: "ex1",
  name: "Hemograma completo",
  file_url: "data:application/pdf;base64,abc",
  content_type: "application/pdf",
  size: 4096,
  uploaded_at: "2026-05-01T12:00:00Z",
};

describe("exams API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchExams()", () => {
    it("calls GET /api/v1/students/:id/exams", async () => {
      mockGet.mockResolvedValue([exam]);
      const result = await fetchExams("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/exams");
      expect(result).toEqual([exam]);
    });
  });

  describe("createExam()", () => {
    it("posts to exams with the payload", async () => {
      mockPost.mockResolvedValue(exam);
      await createExam("s1", {
        name: "Hemograma completo",
        file_url: "data:application/pdf;base64,abc",
        content_type: "application/pdf",
        size: 4096,
        uploaded_at: "2026-05-01T12:00:00Z",
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/students/s1/exams",
        expect.objectContaining({ name: "Hemograma completo" }),
      );
    });
  });

  describe("deleteExam()", () => {
    it("sends DELETE with allowEmpty", async () => {
      mockDel.mockResolvedValue(null);
      await deleteExam("s1", "ex1");
      expect(mockDel).toHaveBeenCalledWith("/api/v1/students/s1/exams/ex1", {
        allowEmpty: true,
      });
    });
  });
});
