import { describe, it, expect, afterEach, vi } from "vitest";
import { isOfflineMode } from "./offline-mode";

describe("isOfflineMode()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true when VITE_OFFLINE is unset (empty)", () => {
    vi.stubEnv("VITE_OFFLINE", "");
    expect(isOfflineMode()).toBe(true);
  });

  it("returns false when VITE_OFFLINE is 'false'", () => {
    vi.stubEnv("VITE_OFFLINE", "false");
    expect(isOfflineMode()).toBe(false);
  });

  it("returns true when VITE_OFFLINE is 'true'", () => {
    vi.stubEnv("VITE_OFFLINE", "true");
    expect(isOfflineMode()).toBe(true);
  });

  it("is case-insensitive and trims whitespace for 'false'", () => {
    vi.stubEnv("VITE_OFFLINE", " FALSE ");
    expect(isOfflineMode()).toBe(false);
  });

  it("treats any value other than 'false' as offline", () => {
    vi.stubEnv("VITE_OFFLINE", "nope");
    expect(isOfflineMode()).toBe(true);
  });
});
