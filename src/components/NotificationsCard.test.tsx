import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsCard } from "./NotificationsCard";

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

const mockUsePushNotifications = vi.mocked(usePushNotifications);

function mockHook(overrides: Partial<ReturnType<typeof usePushNotifications>> = {}) {
  mockUsePushNotifications.mockReturnValue({
    isSupported: true,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("Notification", { permission: "granted" });
});

describe("NotificationsCard", () => {
  it("shows an unsupported message when the browser lacks push support", () => {
    mockHook({ isSupported: false });
    render(<NotificationsCard />);

    expect(
      screen.getByText("Seu navegador não é compatível com notificações push."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("reflects the subscribed state on the switch", () => {
    mockHook({ isSubscribed: true });
    render(<NotificationsCard />);

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls subscribe and shows a success toast when turned on", async () => {
    const subscribe = vi.fn().mockResolvedValue(undefined);
    mockHook({ subscribe });
    const user = userEvent.setup();
    render(<NotificationsCard />);

    await user.click(screen.getByRole("switch"));

    expect(subscribe).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Notificações ativadas");
  });

  it("calls unsubscribe and shows a toast when turned off", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(undefined);
    mockHook({ isSubscribed: true, unsubscribe });
    const user = userEvent.setup();
    render(<NotificationsCard />);

    await user.click(screen.getByRole("switch"));

    expect(unsubscribe).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Notificações desativadas");
  });

  it("shows a blocked-permission hint and disables the switch when denied", () => {
    mockHook({ permission: "denied" });
    render(<NotificationsCard />);

    expect(
      screen.getByText("Notificações bloqueadas nas configurações do navegador."),
    ).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
