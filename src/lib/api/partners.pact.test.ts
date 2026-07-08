/**
 * Walking-skeleton Pact contract: proves the full consumer → mock server →
 * generated pact.json → provider-verification loop works end to end before
 * the pattern is applied to the other 13 domains. See docs/pact.md.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  eachLike,
  enumString,
  errorStringBody,
  idString,
  iso8601Date,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  createPartner,
  deletePartner,
  fetchPartners,
  updatePartner,
  type PartnerCategory,
} from "./partners";

const PARTNER_CATEGORIES: PartnerCategory[] = [
  "Nutrition",
  "Physiotherapy",
  "Sports Medicine",
  "Supplementation",
  "Aesthetics",
  "Laboratories",
];

describe("partners API contract", () => {
  it("returns the list of partners", async () => {
    const pact = createPact();

    const partnerTemplate = {
      id: idString("1"),
      name: like("Clínica Exemplo"),
      logo_url: like("https://example.com/logo.png"),
      category: enumString(PARTNER_CATEGORIES, "Nutrition"),
      description: like("Uma parceria com desconto exclusivo."),
      discount_details: like("10% off on the first visit."),
      coupon: like("FORLIFE10"),
      link: like("https://example.com"),
      created_at: iso8601Date(),
    };

    pact
      .given("at least one partner exists")
      .uponReceiving("a request for the list of partners")
      .withRequest({
        method: "GET",
        path: "/api/v1/partners",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: eachLike(partnerTemplate, 1) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const partners = await fetchPartners();
        expect(partners.length).toBeGreaterThan(0);
        expect(partners[0]).toMatchObject({ name: expect.any(String) });
      });
    });
  });

  it("returns an empty array when no partners exist", async () => {
    const pact = createPact();

    pact
      .given("no partners exist")
      .uponReceiving("a request for the list of partners when none exist")
      .withRequest({
        method: "GET",
        path: "/api/v1/partners",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const partners = await fetchPartners();
        expect(partners).toEqual([]);
      });
    });
  });

  it("creates a partner", async () => {
    const pact = createPact();
    const payload = { name: "Novo Parceiro", category: "Nutrition" as const };
    pact
      .given("an admin is authenticated for partner management")
      .uponReceiving("a request to create a partner")
      .withRequest({
        method: "POST",
        path: "/api/v1/partners",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: {
            id: idString("2101"),
            name: like("Novo Parceiro"),
            logo_url: nullValue(),
            category: enumString(PARTNER_CATEGORIES, "Nutrition"),
            description: nullValue(),
            discount_details: nullValue(),
            coupon: nullValue(),
            link: nullValue(),
            created_at: iso8601Date(),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const partner = await createPartner(payload);
        expect(partner.id).toEqual(expect.any(String));
      });
    });
  });

  it("rejects creation from a non-admin role", async () => {
    const pact = createPact();
    const payload = { name: "Novo Parceiro", category: "Nutrition" as const };
    pact
      .given("a personal is authenticated for partner management")
      .uponReceiving("a request to create a partner from a non-admin role")
      .withRequest({
        method: "POST",
        path: "/api/v1/partners",
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
        await expect(createPartner(payload)).rejects.toMatchObject({ status: 403 });
      });
    });
  });

  it("updates a partner", async () => {
    const pact = createPact();
    pact
      .given("a partner with id 2102 exists")
      .uponReceiving("a request to update a partner")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/partners/2102",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { coupon: "NOVO20" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: {
            id: idString("2102"),
            name: like("Parceiro Exemplo"),
            logo_url: like("https://example.com/logo.png"),
            category: enumString(PARTNER_CATEGORIES, "Nutrition"),
            description: like("Uma parceria."),
            discount_details: like("10% off on the first visit."),
            coupon: like("NOVO20"),
            link: like("https://example.com"),
            created_at: iso8601Date(),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const partner = await updatePartner("2102", { coupon: "NOVO20" });
        expect(partner.coupon).toEqual(expect.any(String));
      });
    });
  });

  it("deletes a partner", async () => {
    const pact = createPact();
    pact
      .given("a partner with id 2103 exists")
      .uponReceiving("a request to delete a partner")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/partners/2103",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deletePartner("2103")).resolves.toBeNull();
      });
    });
  });
});
