/**
 * Lean coverage (see docs/pact.md): happy path for the presign endpoint —
 * the only server-side call in the upload flow (the S3 PUT itself is a
 * third-party call, out of scope for this contract).
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { http } from "./http";

describe("uploads API contract", () => {
  it("presigns an upload for a student's evolution photo", async () => {
    const pact = createPact();
    pact
      .given("a student with id 2201 exists for uploads")
      .uponReceiving("a request to presign an evolution photo upload")
      .withRequest({
        method: "POST",
        path: "/api/v1/uploads/presign",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: {
          filename: "photo.jpg",
          content_type: "image/jpeg",
          context: "evolution_photo",
          student_id: "2201",
        },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: {
            upload_url: like("https://clinic-for-life.s3.us-east-1.amazonaws.com/uploads/..."),
            public_url: like(
              "https://clinic-for-life.s3.us-east-1.amazonaws.com/uploads/photo.jpg",
            ),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const result = await http.post("/api/v1/uploads/presign", {
          filename: "photo.jpg",
          content_type: "image/jpeg",
          context: "evolution_photo",
          student_id: "2201",
        });
        expect(result).toBeDefined();
      });
    });
  });
});
