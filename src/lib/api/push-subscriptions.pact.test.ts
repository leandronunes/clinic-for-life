import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { idString, iso8601Date, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { subscribePush, unsubscribePush } from "./push-subscriptions";

describe("push subscriptions API contract", () => {
  it("subscribes the current user to push notifications", async () => {
    const pact = createPact();
    const payload = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "BExampleKey", auth: "authExampleSecret" },
    };

    pact
      .given("a student is authenticated for push subscriptions")
      .uponReceiving("a request to create a push subscription")
      .withRequest({
        method: "POST",
        path: "/api/v1/push_subscriptions",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: {
            id: idString("1"),
            endpoint: like(payload.endpoint),
            created_at: iso8601Date(),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const result = await subscribePush(payload);
        expect(result.id).toEqual(expect.any(String));
      });
    });
  });

  it("unsubscribes the current user from push notifications", async () => {
    const pact = createPact();
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc123";

    pact
      .given("a student is authenticated for push subscriptions")
      .uponReceiving("a request to delete a push subscription")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/push_subscriptions",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { endpoint },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(unsubscribePush(endpoint)).resolves.toBeNull();
      });
    });
  });
});
