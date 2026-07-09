import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePushNotifications } from "./use-push-notifications";

vi.mock("@/lib/api/push-subscriptions", () => ({
  subscribePush: vi.fn(),
  unsubscribePush: vi.fn(),
}));

import { subscribePush, unsubscribePush } from "@/lib/api/push-subscriptions";

const mockSubscribePush = vi.mocked(subscribePush);
const mockUnsubscribePush = vi.mocked(unsubscribePush);

function makeSubscription(endpoint = "https://fcm.googleapis.com/fcm/send/mock") {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: "p256dh-value", auth: "auth-value" } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

function stubSupport({
  getSubscription = null as ReturnType<typeof makeSubscription> | null,
  subscribeResult = makeSubscription(),
  requestPermission = vi.fn().mockResolvedValue("granted"),
  permission = "default" as NotificationPermission,
} = {}) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(getSubscription),
    subscribe: vi.fn().mockResolvedValue(subscribeResult),
  };
  vi.stubGlobal("Notification", { requestPermission, permission });
  vi.stubGlobal("PushManager", class {});
  Object.defineProperty(globalThis.navigator, "serviceWorker", {
    value: { ready: Promise.resolve({ pushManager }) },
    configurable: true,
  });
  return { pushManager };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePushNotifications", () => {
  it("reports unsupported when the browser lacks the required APIs", () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.permission).toBe("unsupported");
  });

  it("reports supported and reflects an existing subscription", async () => {
    stubSupport({ getSubscription: makeSubscription() });

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(true);
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
  });

  it("subscribes: requests permission, calls pushManager.subscribe, posts to the API", async () => {
    const subscription = makeSubscription();
    const { pushManager } = stubSupport({ subscribeResult: subscription });
    mockSubscribePush.mockResolvedValue({
      id: "1",
      endpoint: subscription.endpoint,
      created_at: "2026-01-01",
    });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(mockSubscribePush).toHaveBeenCalledWith({
      endpoint: subscription.endpoint,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    });
    expect(result.current.isSubscribed).toBe(true);
  });

  it("does not call pushManager.subscribe when permission is denied", async () => {
    const { pushManager } = stubSupport({
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(mockSubscribePush).not.toHaveBeenCalled();
    expect(result.current.permission).toBe("denied");
  });

  it("rejects instead of hanging when no service worker ever becomes ready", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "default",
    });
    vi.stubGlobal("PushManager", class {});
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { ready: new Promise(() => {}) }, // never resolves — e.g. `npm run dev`, no SW registered
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());

    let caught: unknown;
    await act(async () => {
      const pending = result.current.subscribe().catch((error: unknown) => {
        caught = error;
      });
      await vi.advanceTimersByTimeAsync(8000);
      await pending;
    });

    expect(caught).toBeInstanceOf(Error);
    expect(result.current.isLoading).toBe(false);
    expect(mockSubscribePush).not.toHaveBeenCalled();
  });

  it("unsubscribes: deletes on the API then calls subscription.unsubscribe()", async () => {
    const subscription = makeSubscription();
    stubSupport({ getSubscription: subscription });
    mockUnsubscribePush.mockResolvedValue(null);

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockUnsubscribePush).toHaveBeenCalledWith(subscription.endpoint);
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });
});
