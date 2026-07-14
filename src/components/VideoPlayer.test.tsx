import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { VideoPlayer } from "./VideoPlayer";

describe("VideoPlayer", () => {
  it("renders the video with the given src by default", () => {
    render(<VideoPlayer src="https://example.com/video.mp4" />);

    const video = document.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
    expect(screen.queryByText(/ainda está sendo processado/i)).not.toBeInTheDocument();
  });

  it("shows a retry fallback instead of the video when it fails to load", () => {
    render(<VideoPlayer src="https://example.com/video.mp4" />);

    fireEvent.error(document.querySelector("video")!);

    expect(screen.getByText(/ainda está sendo processado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
    expect(document.querySelector("video")).not.toBeInTheDocument();
  });

  it("remounts a single video element when retrying", async () => {
    const user = userEvent.setup();
    render(<VideoPlayer src="https://example.com/video.mp4" />);
    fireEvent.error(document.querySelector("video")!);

    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    const videos = document.querySelectorAll("video");
    expect(videos).toHaveLength(1);
    expect(videos[0]).toHaveAttribute("src", "https://example.com/video.mp4");
    expect(screen.queryByText(/ainda está sendo processado/i)).not.toBeInTheDocument();
  });

  it("shows the fallback again if the retried video also fails", async () => {
    const user = userEvent.setup();
    render(<VideoPlayer src="https://example.com/video.mp4" />);
    fireEvent.error(document.querySelector("video")!);
    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    fireEvent.error(document.querySelector("video")!);

    expect(screen.getByText(/ainda está sendo processado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
  });
});
