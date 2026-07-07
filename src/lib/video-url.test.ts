import { describe, it, expect } from "vitest";
import { isUploadedVideo } from "./video-url";

describe("isUploadedVideo()", () => {
  it("returns false for an empty/undefined url", () => {
    expect(isUploadedVideo()).toBe(false);
    expect(isUploadedVideo("")).toBe(false);
  });

  it("returns true for a blob: url", () => {
    expect(isUploadedVideo("blob:http://localhost/abc")).toBe(true);
  });

  it("returns true for a data:video url", () => {
    expect(isUploadedVideo("data:video/mp4;base64,AAAA")).toBe(true);
  });

  it("returns true for an https S3/CDN url", () => {
    expect(isUploadedVideo("https://cdn.example.com/exercise_1.mp4")).toBe(true);
  });

  it("returns false for a YouTube embed url", () => {
    expect(isUploadedVideo("https://www.youtube.com/embed/abc123")).toBe(false);
    expect(isUploadedVideo("https://youtu.be/abc123")).toBe(false);
  });
});
