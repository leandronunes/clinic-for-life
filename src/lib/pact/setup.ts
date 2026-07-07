/**
 * Shared PactV3 factory for every `*.pact.test.ts` file. Keeps the
 * consumer/provider pacticipant names — which must match exactly what the
 * backend's spec/pact/consumers/*_spec.rb declares — and the output
 * directory in one place.
 */
import path from "node:path";
import { PactV3 } from "@pact-foundation/pact";
import { vi } from "vitest";
import { setAuthTokenGetter } from "@/lib/api/http";
import { FAKE_TOKEN } from "./auth-fixtures";

export const CONSUMER_NAME = "clinic-for-life";
export const PROVIDER_NAME = "clinic-for-life-backend";

export function createPact(): PactV3 {
  return new PactV3({
    consumer: CONSUMER_NAME,
    provider: PROVIDER_NAME,
    dir: path.resolve(process.cwd(), "pacts"),
  });
}

/**
 * Points `@/lib/api/http` at the Pact mock server for the duration of
 * `testFn`, bypassing the offline-mock layer that's on by default in dev and
 * registering the shape-only fake token (see auth-fixtures.ts) as the
 * current auth token unless `authenticated: false` is passed for a
 * 401-scenario interaction. Restores everything afterwards so pact tests
 * never leak state into other tests in the same run.
 */
export async function withMockServerEnv<T>(
  mockServerUrl: string,
  testFn: () => Promise<T>,
  { authenticated = true }: { authenticated?: boolean } = {},
): Promise<T> {
  vi.stubEnv("VITE_API_BASE_URL", mockServerUrl);
  vi.stubEnv("VITE_OFFLINE", "false");
  setAuthTokenGetter(() => (authenticated ? FAKE_TOKEN : null));
  try {
    return await testFn();
  } finally {
    vi.unstubAllEnvs();
    setAuthTokenGetter(() => null);
  }
}
