/**
 * Lean coverage (see docs/pact.md): happy path for every endpoint in this
 * domain, plus the "measurement already has a photo" validation error.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { errorStringBody, idString, iso8601Date, like, nullValue } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  createEvolutionPhoto,
  deleteEvolutionPhoto,
  fetchEvolutionPhotos,
} from "./evolution-photos";
import { http } from "./http";

const photoTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1601"),
  measurement_id: nullValue(),
  taken_on: iso8601Date(),
  image_url: like("https://example.com/photo.jpg"),
  ...overrides,
});

describe("evolution photos API contract", () => {
  it("lists the bioimpedance measurements used for the evolution chart", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1401 has measurements and photos")
      .uponReceiving("a request for a student's evolution measurements")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1401/evolution",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: like([]) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const measurements = await http.get("/api/v1/students/1401/evolution");
        expect(measurements).toBeDefined();
      });
    });
  });

  it("lists a student's evolution photos", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1401 has an evolution photo 1601")
      .uponReceiving("a request for a student's evolution photos")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1401/evolution/photos",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [photoTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const photos = await fetchEvolutionPhotos("1401");
        expect(photos.length).toBeGreaterThan(0);
      });
    });
  });

  it("creates an evolution photo for a measurement", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1401 has a measurement with no photo yet")
      .uponReceiving("a request to create an evolution photo")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/1401/evolution/photos",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { bioimpedance_measurement_id: "1501", image_url: "https://example.com/photo.jpg" },
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: photoTemplate({ measurement_id: idString("1501") }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const photo = await createEvolutionPhoto("1401", {
          bioimpedance_measurement_id: "1501",
          image_url: "https://example.com/photo.jpg",
        });
        expect(photo.id).toEqual(expect.any(String));
      });
    });
  });

  it("rejects a photo for a measurement that already has one", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1401 has a measurement that already has a photo")
      .uponReceiving("a request to create a duplicate evolution photo")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/1401/evolution/photos",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { bioimpedance_measurement_id: "1501", image_url: "https://example.com/other.jpg" },
      })
      .willRespondWith({
        status: 422,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Esta medição já possui uma foto associada"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(
          createEvolutionPhoto("1401", {
            bioimpedance_measurement_id: "1501",
            image_url: "https://example.com/other.jpg",
          }),
        ).rejects.toMatchObject({ status: 422 });
      });
    });
  });

  it("deletes an evolution photo", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1401 has an evolution photo 1601")
      .uponReceiving("a request to delete an evolution photo")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/students/1401/evolution/photos/1601",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deleteEvolutionPhoto("1401", "1601")).resolves.toBeUndefined();
      });
    });
  });
});
