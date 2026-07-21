import { describe, it, expect } from "vitest";
import { isMutuallyConfirmed, needsConfirmationFrom } from "./check-in-confirmation";

describe("isMutuallyConfirmed", () => {
  it("is false when neither side has confirmed", () => {
    expect(isMutuallyConfirmed({ student_confirmed_at: null, personal_confirmed_at: null })).toBe(
      false,
    );
  });

  it("is false when only the student has confirmed", () => {
    expect(
      isMutuallyConfirmed({
        student_confirmed_at: "2026-07-10T10:00:00Z",
        personal_confirmed_at: null,
      }),
    ).toBe(false);
  });

  it("is false when only the personal has confirmed", () => {
    expect(
      isMutuallyConfirmed({
        student_confirmed_at: null,
        personal_confirmed_at: "2026-07-10T10:00:00Z",
      }),
    ).toBe(false);
  });

  it("is true when both sides have confirmed", () => {
    expect(
      isMutuallyConfirmed({
        student_confirmed_at: "2026-07-10T10:00:00Z",
        personal_confirmed_at: "2026-07-10T11:00:00Z",
      }),
    ).toBe(true);
  });
});

describe("needsConfirmationFrom", () => {
  it("staff viewer: needs confirmation when personal_confirmed_at is missing", () => {
    expect(
      needsConfirmationFrom(
        { student_confirmed_at: "2026-07-10T10:00:00Z", personal_confirmed_at: null },
        true,
      ),
    ).toBe(true);
  });

  it("staff viewer: does not need confirmation once personal_confirmed_at is present", () => {
    expect(
      needsConfirmationFrom(
        {
          student_confirmed_at: "2026-07-10T10:00:00Z",
          personal_confirmed_at: "2026-07-10T11:00:00Z",
        },
        true,
      ),
    ).toBe(false);
  });

  it("student viewer: needs confirmation when student_confirmed_at is missing", () => {
    expect(
      needsConfirmationFrom(
        { student_confirmed_at: null, personal_confirmed_at: "2026-07-10T11:00:00Z" },
        false,
      ),
    ).toBe(true);
  });

  it("student viewer: does not need confirmation once student_confirmed_at is present", () => {
    expect(
      needsConfirmationFrom(
        {
          student_confirmed_at: "2026-07-10T10:00:00Z",
          personal_confirmed_at: "2026-07-10T11:00:00Z",
        },
        false,
      ),
    ).toBe(false);
  });
});
