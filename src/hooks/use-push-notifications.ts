import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "@/lib/api/push-subscriptions";

// Only consumer of this helper is this hook — kept inline rather than a
// shared util, same reasoning as detectStandalone/detectIOS in use-pwa-install.ts.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

function detectSupport() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// navigator.serviceWorker.ready never rejects on its own — it just hangs
// forever if no service worker ends up active for this page (e.g. running
// `npm run dev`, where the SW only registers in production builds per
// src/main.tsx). Race it against a timeout so callers get a rejection to
// catch instead of a permanently "loading" UI with no feedback.
function getReadyRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Nenhum service worker ativo foi encontrado (rode a build de produção: npm run build && npm run preview)",
            ),
          ),
        timeoutMs,
      ),
    ),
  ]);
}

export function usePushNotifications() {
  const [isSupported] = useState(detectSupport);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    detectSupport() ? Notification.permission : "unsupported",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;

    getReadyRegistration()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setIsSubscribed(!!subscription);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  async function subscribe() {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      const registration = await getReadyRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey ?? ""),
      });
      const json = subscription.toJSON();
      await subscribePush({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const registration = await getReadyRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
