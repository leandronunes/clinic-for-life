/**
 * Lean coverage (see docs/pact.md): happy path for every endpoint in this
 * domain, plus the 403-outside-scope shape that differs structurally from
 * the happy path.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  enumString,
  errorArrayBody,
  errorStringBody,
  idString,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchConversations, fetchMessages, markConversationRead, sendMessage } from "./chat";

const SENDER_ROLES = ["personal", "aluno"];

const messageTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("2821"),
  student_id: idString("2801"),
  sender_role: enumString(SENDER_ROLES, "personal"),
  sender_id: idString("1"),
  sender_name: like("Rafael Monteiro"),
  body: like("Oi! Como foi o treino?"),
  created_at: like("2026-07-21T10:00:00Z"),
  read_at: nullValue(),
  ...overrides,
});

const conversationTemplate = (overrides: Record<string, unknown> = {}) => ({
  student_id: idString("2801"),
  student_name: like("Ana Silva"),
  student_avatar_url: nullValue(),
  trainer_id: idString("1"),
  trainer_name: like("Rafael Monteiro"),
  last_message: messageTemplate(),
  unread_count: like(1),
  updated_at: like("2026-07-21T10:00:00Z"),
  ...overrides,
});

describe("chat API contract", () => {
  it("lists conversations, including one with an unread message", async () => {
    const pact = createPact();
    pact
      .given("a personal has 2 students, one with an unread message")
      .uponReceiving("a request for the personal's conversations")
      .withRequest({
        method: "GET",
        path: "/api/v1/chat/conversations",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: [
            conversationTemplate(),
            conversationTemplate({
              student_id: idString("2802"),
              student_name: like("Bruno Costa"),
              last_message: nullValue(),
              unread_count: like(0),
            }),
          ],
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const conversations = await fetchConversations();
        expect(conversations.length).toBeGreaterThan(0);
      });
    });
  });

  it("lists the messages of a conversation in chronological order", async () => {
    const pact = createPact();
    pact
      .given("a conversation with student_id 2803 has 2 messages")
      .uponReceiving("a request for a conversation's messages")
      .withRequest({
        method: "GET",
        path: "/api/v1/chat/conversations/2803/messages",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: [
            messageTemplate({ id: idString("2821"), student_id: idString("2803") }),
            messageTemplate({
              id: idString("2822"),
              student_id: idString("2803"),
              sender_role: enumString(SENDER_ROLES, "aluno"),
              body: like("Foi ótimo! 😄"),
            }),
          ],
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const messages = await fetchMessages("2803");
        expect(messages).toHaveLength(2);
      });
    });
  });

  it("sends a new message", async () => {
    const pact = createPact();
    pact
      .given("a student_id 2804 exists and accepts new messages")
      .uponReceiving("a request to send a chat message")
      .withRequest({
        method: "POST",
        path: "/api/v1/chat/conversations/2804/messages",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { body: "Bom treino hoje!" },
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: messageTemplate({
            student_id: idString("2804"),
            body: like("Bom treino hoje!"),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const message = await sendMessage("2804", "Bom treino hoje!");
        expect(message.body).toEqual(expect.any(String));
      });
    });
  });

  it("rejects an empty message body", async () => {
    const pact = createPact();
    pact
      .given("a student_id 2804 exists and accepts new messages")
      .uponReceiving("a request to send an empty chat message")
      .withRequest({
        method: "POST",
        path: "/api/v1/chat/conversations/2804/messages",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { body: "" },
      })
      .willRespondWith({
        status: 422,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorArrayBody("Body não pode ficar em branco"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(sendMessage("2804", "")).rejects.toMatchObject({ status: 422 });
      });
    });
  });

  it("marks a conversation as read", async () => {
    const pact = createPact();
    pact
      .given("a student_id 2805 exists to mark messages as read")
      .uponReceiving("a request to mark a conversation as read")
      .withRequest({
        method: "POST",
        path: "/api/v1/chat/conversations/2805/read",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: { read: like(1) } },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const result = await markConversationRead("2805");
        expect(result.read).toEqual(expect.any(Number));
      });
    });
  });

  it("rejects a conversation outside the current user's scope", async () => {
    const pact = createPact();
    pact
      .given("a student_id 2806 does not belong to the current user")
      .uponReceiving("a request for a conversation outside the current user's scope")
      .withRequest({
        method: "GET",
        path: "/api/v1/chat/conversations/2806/messages",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 403,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Forbidden"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(fetchMessages("2806")).rejects.toMatchObject({ status: 403 });
      });
    });
  });
});
