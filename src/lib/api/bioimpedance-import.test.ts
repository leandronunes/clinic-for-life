import { describe, it, expect, vi, beforeEach } from "vitest";
import { importBioimpedanceFile, type BioImportResult } from "./bioimpedance-import";

vi.mock("./http", () => ({
  http: { post: vi.fn() },
}));

import { http } from "./http";

const mockPost = vi.mocked(http.post);

describe("bioimpedance-import API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts FormData to /api/v1/bioimpedance/import with student_id", async () => {
    const result: BioImportResult = { imported: 3, errors: [], preview: [] };
    mockPost.mockResolvedValue(result);

    const file = new File(["csv content"], "export.csv", { type: "text/csv" });
    const res = await importBioimpedanceFile("s1", file);

    expect(mockPost).toHaveBeenCalledWith("/api/v1/bioimpedance/import", expect.any(FormData), {
      params: { student_id: "s1" },
    });
    const fd = mockPost.mock.calls[0][1] as FormData;
    expect(fd.get("file")).toBe(file);
    expect(fd.get("student_id")).toBe("s1");
    expect(res).toEqual(result);
  });

  it("also accepts a PDF report — the backend auto-detects the format", async () => {
    const result: BioImportResult = { imported: 1, errors: [], preview: [] };
    mockPost.mockResolvedValue(result);

    const file = new File(["%PDF-1.4 ..."], "relatorio.pdf", { type: "application/pdf" });
    const res = await importBioimpedanceFile("s1", file);

    const fd = mockPost.mock.calls[0][1] as FormData;
    expect(fd.get("file")).toBe(file);
    expect(res).toEqual(result);
  });
});
