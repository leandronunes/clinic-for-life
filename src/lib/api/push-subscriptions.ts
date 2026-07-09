import { http } from "./http";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionResponse {
  id: string;
  endpoint: string;
  created_at: string;
}

export function subscribePush(payload: PushSubscriptionPayload): Promise<PushSubscriptionResponse> {
  return http.post<PushSubscriptionResponse>("/api/v1/push_subscriptions", payload);
}

export function unsubscribePush(endpoint: string): Promise<null> {
  return http.del<null>("/api/v1/push_subscriptions", { body: { endpoint }, allowEmpty: true });
}
