import { describe, it, expect, afterEach, vi } from "vitest";
import { isOfflineMode } from "./offline-mode";

describe("isOfflineMode()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when VITE_OFFLINE is unset", () => {
    vi.stubEnv("VITE_OFFLINE", "");
    expect(isOfflineMode()).toBe(false);
  });

  it("returns false when VITE_OFFLINE is 'false'", () => {
    vi.stubEnv("VITE_OFFLINE", "false");
    expect(isOfflineMode()).toBe(false);
  });

  it("returns true when VITE_OFFLINE is 'true'", () => {
    vi.stubEnv("VITE_OFFLINE", "true");
    expect(isOfflineMode()).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    vi.stubEnv("VITE_OFFLINE", " TRUE ");
    expect(isOfflineMode()).toBe(true);
  });
});
