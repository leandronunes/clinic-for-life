/**
 * Lean coverage (see docs/pact.md): happy path + applicable auth/validation
 * errors for every endpoint in this domain.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { eachLike, errorStringBody, idString, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchOrganizations, updateOrganization } from "./organizations";

describe("organizations API contract", () => {
  it("lists organizations", async () => {
    const pact = createPact();
    const organizationTemplate = {
      id: idString("801"),
      name: like("Clínica Exemplo"),
      domain: like("clinica-exemplo"),
    };

    pact
      .given("at least one organization exists")
      .uponReceiving("a request for the list of organizations")
      .withRequest({
        method: "GET",
        path: "/api/v1/organizations",
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: eachLike(organizationTemplate, 1) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const organizations = await fetchOrganizations();
        expect(organizations.length).toBeGreaterThan(0);
      });
    });
  });

  it("updates an organization", async () => {
    const pact = createPact();
    pact
      .given("an admin is authenticated for organization 802")
      .uponReceiving("a request to update the admin's own organization")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/organizations/802",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { name: "Clínica Renomeada" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: {
            id: idString("802"),
            name: like("Clínica Renomeada"),
            domain: like("clinica-renomeada"),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const organization = await updateOrganization("802", { name: "Clínica Renomeada" });
        expect(organization.name).toEqual(expect.any(String));
      });
    });
  });

  it("rejects an update from a non-admin role", async () => {
    const pact = createPact();
    pact
      .given("a personal is authenticated for organization 803")
      .uponReceiving("a request to update an organization from a non-admin role")
      .withRequest({
        method: "PATCH",
        path: "/api/v1/organizations/803",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { name: "Clínica Renomeada" },
      })
      .willRespondWith({
        status: 403,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Forbidden"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(
          updateOrganization("803", { name: "Clínica Renomeada" }),
        ).rejects.toMatchObject({
          status: 403,
        });
      });
    });
  });
});
