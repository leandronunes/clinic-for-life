import { describe, it, expect, afterEach, vi } from "vitest";
import { isFeatureEnabled } from "./feature-flags";

describe("isFeatureEnabled()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to false (hidden) when the flag's env var is unset", () => {
    vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "");
    expect(isFeatureEnabled("attendanceCycles")).toBe(false);
  });

  it("returns true when explicitly set to 'true'", () => {
    vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "true");
    expect(isFeatureEnabled("attendanceCycles")).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", " TRUE ");
    expect(isFeatureEnabled("attendanceCycles")).toBe(true);
  });

  it("treats any value other than 'true' as hidden", () => {
    vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "1");
    expect(isFeatureEnabled("attendanceCycles")).toBe(false);
  });
});
