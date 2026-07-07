/**
 * Lean coverage (see docs/pact.md): happy path + applicable auth/validation
 * errors for every endpoint in this domain.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  enumString,
  errorStringBody,
  idString,
  integer,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  createTrainer,
  deleteTrainer,
  fetchTrainer,
  fetchTrainers,
  updateTrainer,
} from "./trainers";

const STATUSES = ["active", "blocked", "inactive"];

const trainerTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("601"),
  name: like("Ana Personal"),
  cpf: like("12345678900"),
  cref: like("012345-G/SP"),
  email: like("ana@forlife.app"),
  phone: like("(11) 91111-0000"),
  status: enumString(STATUSES, "active"),
  avatar_url: nullValue(),
  students_count: integer(0),
  ...overrides,
});

describe("trainers API contract", () => {
  it("lists trainers", async () => {
    const pact = createPact();
    pact
      .given("at least one trainer exists")
      .uponReceiving("a request for the list of trainers")
      .withRequest({
        method: "GET",
        path: "/api/v1/trainers",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [trainerTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const trainers = await fetchTrainers();
        expect(trainers.length).toBeGreaterThan(0);
      });
    });
  });

  it("searches trainers by query", async () => {
    const pact = createPact();
    pact
      .given("a trainer matching the search query exists")
      .uponReceiving("a search request for trainers")
      .withRequest({
        method: "GET",
        path: "/api/v1/trainers/search",
        query: { query: "Ana" },
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [trainerTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const trainers = await fetchTrainers("Ana");
        expect(trainers.length).toBeGreaterThan(0);
      });
    });
  });

  it("shows a trainer", async () => {
    const pact = createPact();
    pact
      .given("a trainer with id 601 exists")
      .uponReceiving("a request for an existing trainer")
      .withRequest({
        method: "GET",
        path: "/api/v1/trainers/601",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: trainerTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const trainer = await fetchTrainer("601");
        expect(trainer.id).toEqual(expect.any(String));
      });
    });
  });

  it("returns 404 for a missing trainer", async () => {
    const pact = createPact();
    pact
      .given("no trainer exists with the given id")
      .uponReceiving("a request for a trainer that does not exist")
      .withRequest({
        method: "GET",
        path: "/api/v1/trainers/999999",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 404,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Couldn't find Trainer with 'id'=999999"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(fetchTrainer("999999")).rejects.toMatchObject({ status: 404 });
      });
    });
  });

  it("creates a trainer", async () => {
    const pact = createPact();
    const payload = {
      name: "Novo Personal",
      email: "novo.personal@forlife.app",
      phone: "(11) 92222-0000",
    };
    pact
      .given("an admin is authenticated for trainer management")
      .uponReceiving("a request to create a trainer")
      .withRequest({
        method: "POST",
        path: "/api/v1/trainers",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: trainerTemplate({
            name: like("Novo Personal"),
            cpf: nullValue(),
            cref: nullValue(),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const trainer = await createTrainer(payload);
        expect(trainer.id).toEqual(expect.any(String));
      });
    });
  });

  it("rejects creation from a non-admin role", async () => {
    const pact = createPact();
    const payload = {
      name: "Novo Personal",
      email: "novo.personal@forlife.app",
      phone: "(11) 92222-0000",
    };
    pact
      .given("a personal is authenticated for trainer management")
      .uponReceiving("a request to create a trainer from a non-admin role")
      .withRequest({
        method: "POST",
        path: "/api/v1/trainers",
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
        await expect(createTrainer(payload)).rejects.toMatchObject({ status: 403 });
      });
    });
  });

  it("updates a trainer", async () => {
    const pact = createPact();
    pact
      .given("a trainer with id 602 exists")
      .uponReceiving("a request to update a trainer")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/trainers/602",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { phone: "(11) 93333-0000" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: trainerTemplate({ id: idString("602"), phone: like("(11) 93333-0000") }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const trainer = await updateTrainer("602", { phone: "(11) 93333-0000" });
        expect(trainer.phone).toEqual(expect.any(String));
      });
    });
  });

  it("deletes a trainer", async () => {
    const pact = createPact();
    pact
      .given("a trainer with id 603 exists")
      .uponReceiving("a request to delete a trainer")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/trainers/603",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deleteTrainer("603")).resolves.toBeUndefined();
      });
    });
  });
});
