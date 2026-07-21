import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  type ChatConversation,
  type ChatMessage,
} from "./chat";

vi.mock("./http", () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);

const message: ChatMessage = {
  id: "m1",
  student_id: "s1",
  sender_role: "personal",
  sender_id: "u1",
  sender_name: "Rafael Monteiro",
  body: "Oi!",
  created_at: "2026-07-21T10:00:00Z",
  read_at: null,
};

const conversation: ChatConversation = {
  student_id: "s1",
  student_name: "Júlia Ferreira",
  student_avatar_url: null,
  trainer_id: "t1",
  trainer_name: "Rafael Monteiro",
  last_message: message,
  unread_count: 1,
  updated_at: "2026-07-21T10:00:00Z",
};

describe("chat API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConversations()", () => {
    it("calls GET /api/v1/chat/conversations", async () => {
      mockGet.mockResolvedValue([conversation]);

      const result = await fetchConversations();

      expect(mockGet).toHaveBeenCalledWith("/api/v1/chat/conversations");
      expect(result).toEqual([conversation]);
    });

    it("propagates errors from the HTTP client", async () => {
      mockGet.mockRejectedValue({ status: 401, message: "Unauthorized" });
      await expect(fetchConversations()).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("fetchMessages()", () => {
    it("calls GET /api/v1/chat/conversations/:student_id/messages", async () => {
      mockGet.mockResolvedValue([message]);

      const result = await fetchMessages("s1");

      expect(mockGet).toHaveBeenCalledWith("/api/v1/chat/conversations/s1/messages");
      expect(result).toEqual([message]);
    });
  });

  describe("sendMessage()", () => {
    it("calls POST /api/v1/chat/conversations/:student_id/messages with the body", async () => {
      mockPost.mockResolvedValue(message);

      const result = await sendMessage("s1", "Oi!");

      expect(mockPost).toHaveBeenCalledWith("/api/v1/chat/conversations/s1/messages", {
        body: "Oi!",
      });
      expect(result).toEqual(message);
    });

    it("propagates a 422 for an empty message", async () => {
      mockPost.mockRejectedValue({ status: 422, message: "Mensagem não pode ficar em branco" });
      await expect(sendMessage("s1", "")).rejects.toMatchObject({ status: 422 });
    });
  });

  describe("markConversationRead()", () => {
    it("calls POST /api/v1/chat/conversations/:student_id/read", async () => {
      mockPost.mockResolvedValue({ read: 3 });

      const result = await markConversationRead("s1");

      expect(mockPost).toHaveBeenCalledWith("/api/v1/chat/conversations/s1/read");
      expect(result).toEqual({ read: 3 });
    });
  });
});
