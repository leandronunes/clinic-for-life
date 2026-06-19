import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTrainers,
  fetchTrainer,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  type Trainer,
  type CreateTrainerPayload,
} from "./trainers";

vi.mock("./http", () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPatch = vi.mocked(http.patch);
const mockDel = vi.mocked(http.del);

const trainer: Trainer = {
  id: "t1",
  name: "Rafael Monteiro",
  cpf: "123.456.789-00",
  cref: "012345-G/SP",
  email: "rafael@forlife.app",
  phone: "(11) 98888-1111",
  status: "active",
  students_count: 18,
};

describe("trainers API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchTrainers()", () => {
    it("calls GET /api/v1/trainers without params when no query given", async () => {
      mockGet.mockResolvedValue([trainer]);
      const result = await fetchTrainers();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/trainers");
      expect(result).toEqual([trainer]);
    });

    it("calls the search endpoint when a query is provided", async () => {
      mockGet.mockResolvedValue([trainer]);
      await fetchTrainers("rafael");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/trainers/search", {
        params: { query: "rafael" },
      });
    });

    it("calls the list endpoint when query is an empty string", async () => {
      mockGet.mockResolvedValue([]);
      await fetchTrainers("  ");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/trainers");
    });
  });

  describe("fetchTrainer()", () => {
    it("calls GET /api/v1/trainers/:id", async () => {
      mockGet.mockResolvedValue(trainer);
      const result = await fetchTrainer("t1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/trainers/t1");
      expect(result).toEqual(trainer);
    });
  });

  describe("createTrainer()", () => {
    it("calls POST /api/v1/trainers with the payload", async () => {
      const payload: CreateTrainerPayload = {
        name: "Nova Personal",
        cpf: "111.222.333-44",
        cref: "099999-G/SP",
        email: "nova@forlife.app",
        phone: "(11) 91111-2222",
      };
      mockPost.mockResolvedValue({ ...trainer, ...payload, id: "t2" });
      await createTrainer(payload);
      expect(mockPost).toHaveBeenCalledWith("/api/v1/trainers", payload);
    });
  });

  describe("updateTrainer()", () => {
    it("calls PATCH /api/v1/trainers/:id with the patch payload", async () => {
      mockPatch.mockResolvedValue({ ...trainer, status: "blocked" });
      await updateTrainer("t1", { status: "blocked" });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/trainers/t1", { status: "blocked" });
    });
  });

  describe("deleteTrainer()", () => {
    it("calls DELETE /api/v1/trainers/:id", async () => {
      mockDel.mockResolvedValue(undefined);
      await deleteTrainer("t1");
      expect(mockDel).toHaveBeenCalledWith("/api/v1/trainers/t1");
    });
  });
});
