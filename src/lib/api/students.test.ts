import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchStudents,
  fetchStudent,
  createStudent,
  updateStudent,
  toBackendSex,
  fromBackendSex,
  type Student,
} from "./students";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPatch = vi.mocked(http.patch);

const student: Student = {
  id: "s1",
  name: "Júlia Ferreira",
  birth_date: "1996-05-12",
  sex: "female",
  height_cm: 168,
  email: "julia@email.com",
  phone: "(11) 97777-1010",
  trainer_id: "t1",
  trainer_name: "Rafael Monteiro",
  status: "active",
  created_at: "2025-09-12T00:00:00Z",
};

describe("students API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("sex mapping helpers", () => {
    it("maps F/M/Outro to backend values", () => {
      expect(toBackendSex("F")).toBe("female");
      expect(toBackendSex("M")).toBe("male");
      expect(toBackendSex("Outro")).toBe("other");
    });

    it("maps backend values to F/M/Outro", () => {
      expect(fromBackendSex("female")).toBe("F");
      expect(fromBackendSex("male")).toBe("M");
      expect(fromBackendSex("other")).toBe("Outro");
    });
  });

  describe("fetchStudents()", () => {
    it("calls GET /api/v1/students without params by default", async () => {
      mockGet.mockResolvedValue([student]);
      const result = await fetchStudents();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students", { params: {} });
      expect(result).toEqual([student]);
    });

    it("passes trainer_id and status params when provided", async () => {
      mockGet.mockResolvedValue([student]);
      await fetchStudents({ trainerId: "t1", status: "active" });
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students", {
        params: { trainer_id: "t1", status: "active" },
      });
    });
  });

  describe("fetchStudent()", () => {
    it("calls GET /api/v1/students/:id", async () => {
      mockGet.mockResolvedValue(student);
      const result = await fetchStudent("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1");
      expect(result).toEqual(student);
    });
  });

  describe("createStudent()", () => {
    it("calls POST /api/v1/students with the payload", async () => {
      mockPost.mockResolvedValue(student);
      await createStudent({
        name: "Júlia",
        birth_date: "1996-05-12",
        sex: "female",
        height_cm: 168,
        email: "julia@email.com",
        phone: "(11) 97777-1010",
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/students",
        expect.objectContaining({ name: "Júlia", sex: "female" }),
      );
    });
  });

  describe("updateStudent()", () => {
    it("calls PATCH /api/v1/students/:id with the patch", async () => {
      mockPatch.mockResolvedValue({ ...student, status: "inactive" });
      await updateStudent("s1", { status: "inactive" });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/students/s1", { status: "inactive" });
    });
  });
});
