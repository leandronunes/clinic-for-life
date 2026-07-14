/**
 * Lean coverage (see docs/pact.md): happy path for the one endpoint in this
 * domain. Multipart bodies use PactV3's file-based upload matcher, so the
 * CSV fixture is written to a temp file rather than held in memory.
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { idString, integer, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { importBioimpedanceFile } from "./bioimpedance-import";

describe("bioimpedance import API contract", () => {
  it("imports a valid InBody CSV export", async () => {
    const pact = createPact();

    const csvPath = join(mkdtempSync(join(tmpdir(), "pact-inbody-")), "export.csv");
    writeFileSync(
      csvPath,
      "data,Equipamento de medição,Peso(kg)\n20260301090000,H30,71.5\n",
      "utf-8",
    );

    pact
      .given("a student with id 1701 exists for CSV import")
      .uponReceiving("a request to import a bioimpedance CSV")
      .withRequestMultipartFileUpload(
        {
          method: "POST",
          path: "/api/v1/bioimpedance/import",
          // PactV3's multipart matcher only asserts on the file part of the
          // body (see setRequestDetails in the SDK — it applies query/headers
          // but never touches `body` for a multipart interaction), so
          // student_id is asserted via query instead. The consumer also sends
          // it as a form field for the same request; Rails merges both.
          query: { student_id: "1701" },
          headers: { Authorization: bearerToken() },
        },
        "text/plain",
        csvPath,
        "file",
      )
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: {
            imported: integer(1),
            errors: like([]),
            preview: like([{ id: idString("1") }]),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const file = new File(
          ["data,Equipamento de medição,Peso(kg)\n20260301090000,H30,71.5\n"],
          "export.csv",
          {
            type: "text/csv",
          },
        );
        const result = await importBioimpedanceFile("1701", file);
        expect(result.imported).toEqual(expect.any(Number));
      });
    });
  });
});
