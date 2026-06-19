import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadPartnerLogoToS3 } from "./uploads";

vi.mock("./http", () => ({
  http: { post: vi.fn() },
}));

import { http } from "./http";

const mockPost = vi.mocked(http.post);

function makeFile(name = "logo.png", type = "image/png"): File {
  return new File(["data"], name, { type });
}

type XHRInstance = {
  open: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  upload: { onprogress?: ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  status: number;
};

function stubXHR(opts: { status?: number; triggerProgress?: boolean } = {}): XHRInstance {
  const { status = 200, triggerProgress = false } = opts;

  const instance: XHRInstance = {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    upload: {},
    onload: null,
    onerror: null,
    status,
  };

  instance.send = vi.fn(function () {
    if (triggerProgress) {
      instance.upload.onprogress?.({
        lengthComputable: true,
        loaded: 60,
        total: 100,
      } as ProgressEvent);
    }
    // Always call onload to trigger the resolution/rejection path
    instance.onload?.();
  });

  // Plain function (not arrow) so it can be used as a constructor.
  // Returning an object from a constructor causes `new Ctor()` to return that object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XHRCtor = function (this: unknown): any {
    return instance;
  };

  vi.stubGlobal("XMLHttpRequest", XHRCtor);
  return instance;
}

describe("uploadPartnerLogoToS3()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("requests presigned URL with partner_logo context and no student_id", async () => {
    stubXHR();
    mockPost.mockResolvedValue({
      upload_url: "https://s3.example.com/presigned",
      public_url: "https://cdn.example.com/partner_logo/logo.png",
    });

    const result = await uploadPartnerLogoToS3(makeFile("logo.png", "image/png"));

    expect(mockPost).toHaveBeenCalledWith("/api/v1/uploads/presign", {
      filename: "logo.png",
      content_type: "image/png",
      context: "partner_logo",
    });
    expect(result).toBe("https://cdn.example.com/partner_logo/logo.png");
  });

  it("sets Content-Type header on S3 PUT", async () => {
    const xhr = stubXHR();
    mockPost.mockResolvedValue({
      upload_url: "https://s3.example.com/presigned",
      public_url: "https://cdn.example.com/logo.png",
    });

    await uploadPartnerLogoToS3(makeFile("logo.png", "image/png"));

    expect(xhr.setRequestHeader).toHaveBeenCalledWith("Content-Type", "image/png");
  });

  it("calls onProgress when upload reports progress", async () => {
    stubXHR({ triggerProgress: true });
    mockPost.mockResolvedValue({
      upload_url: "https://s3.example.com/presigned",
      public_url: "https://cdn.example.com/logo.png",
    });

    const onProgress = vi.fn();
    await uploadPartnerLogoToS3(makeFile(), onProgress);

    expect(onProgress).toHaveBeenCalledWith(60);
  });

  it("rejects when S3 PUT returns a non-2xx status", async () => {
    stubXHR({ status: 403 });
    mockPost.mockResolvedValue({
      upload_url: "https://s3.example.com/presigned",
      public_url: "https://cdn.example.com/logo.png",
    });

    await expect(uploadPartnerLogoToS3(makeFile())).rejects.toThrow("Upload falhou: 403");
  });
});
